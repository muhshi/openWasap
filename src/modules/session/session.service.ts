import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Session, SessionStatus } from './entities/session.entity';
import { assertDeletableStatuses, INACTIVE_SESSION_STATUSES } from './session-status.util';
import { ApiKey, ApiKeyRole } from '../auth/entities/api-key.entity';
import { CreateSessionDto } from './dto';
import { EngineFactory } from '../../engine/engine.factory';
import { IWhatsAppEngine, EngineStatus } from '../../engine/interfaces/whatsapp-engine.interface';
import { createLogger } from '../../common/services/logger.service';
import { EventsGateway } from '../events/events.gateway';
import { WebhookService } from '../webhook/webhook.service';
import { HookManager } from '../../core/hooks';

interface ReconnectState {
  attempts: number;
  timer: NodeJS.Timeout | null;
  maxAttempts: number;
  baseDelay: number;
}

@Injectable()
export class SessionService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = createLogger('SessionService');

  // In-memory map of active engine instances (keyed by session UUID)
  private engines: Map<string, IWhatsAppEngine> = new Map();

  // Mapping from session name to session UUID for flexible identifier lookup
  private sessionNameToId: Map<string, string> = new Map();

  // Reconnection state per session
  private reconnectStates: Map<string, ReconnectState> = new Map();

  constructor(
    @InjectRepository(Session, 'data')
    private readonly sessionRepository: Repository<Session>,
    @InjectDataSource('data')
    private readonly dataSource: DataSource,
    private readonly engineFactory: EngineFactory,
    private readonly eventsGateway: EventsGateway,
    private readonly webhookService: WebhookService,
    private readonly hookManager: HookManager,
  ) {}

  /**
   * On backend startup, reset all active session statuses to disconnected
   * and auto-reconnect sessions that have saved credentials (phone number is set)
   */
  async onModuleInit(): Promise<void> {
    const activeStatuses = [
      SessionStatus.READY,
      SessionStatus.INITIALIZING,
      SessionStatus.QR_READY,
      SessionStatus.AUTHENTICATING,
    ];

    // Find sessions that were active or have an existing phone associated
    const previouslyActiveSessions = await this.sessionRepository.find({
      where: [
        { status: In(activeStatuses) },
      ],
    });

    const result = await this.sessionRepository.update(
      { status: In(activeStatuses) },
      { status: SessionStatus.DISCONNECTED },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Reset ${result.affected} session(s) to disconnected on startup`, {
        action: 'startup_reset',
        affected: result.affected,
      });
    }

    // Auto-reconnect sessions that were previously ready or have registered phone credentials
    const sessionsToRestart = (previouslyActiveSessions || []).filter(s => !!s.phone);
    if (sessionsToRestart.length > 0) {
      this.logger.log(`[AutoStart] Found ${sessionsToRestart.length} session(s) with saved credentials to auto-reconnect`);
      let delayMs = 3000;
      for (const s of sessionsToRestart) {
        setTimeout(() => {
          this.logger.log(`[AutoStart] Auto-starting session: ${s.name} (${s.id})`);
          void this.start(s.id).catch(err => {
            this.logger.warn(`[AutoStart] Failed to auto-start session ${s.name}: ${err?.message || err}`);
          });
        }, delayMs);
        delayMs += 5000; // Stagger startups by 5 seconds
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    // Clean up all engines on shutdown
    for (const [sessionId, engine] of this.engines) {
      this.logger.log(`Destroying engine for session ${sessionId}`, {
        sessionId,
        action: 'shutdown',
      });
      await engine.destroy();
    }
    this.engines.clear();
    this.sessionNameToId.clear();

    // Clear all reconnect timers
    for (const [, state] of this.reconnectStates) {
      if (state.timer) {
        clearTimeout(state.timer);
      }
    }
    this.reconnectStates.clear();
  }

  async create(dto: CreateSessionDto, apiKey?: ApiKey): Promise<Session> {
    // Check if session with same name exists
    const existing = await this.sessionRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Session with name '${dto.name}' already exists`);
    }

    const session = this.sessionRepository.create({
      name: dto.name,
      config: dto.config || {},
      proxyUrl: dto.proxyUrl || null,
      proxyType: dto.proxyType || null,
      status: SessionStatus.CREATED,
      ownerApiKeyId: apiKey ? apiKey.id : null,
    });

    const saved = await this.dataSource.transaction(async manager => {
      return await manager.save(session);
    });
    this.logger.log(`Session created: ${saved.name}`, {
      sessionId: saved.id,
      action: 'create',
    });

    // Execute hook after session created (outside transaction since hooks do external I/O)
    await this.hookManager.execute('session:created', saved, {
      sessionId: saved.id,
      source: 'SessionService',
    });

    return saved;
  }

  async findAll(apiKey?: ApiKey): Promise<Session[]> {
    const findOptions: any = {
      order: { createdAt: 'DESC' },
    };
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN) {
      findOptions.where = { ownerApiKeyId: apiKey.id };
    }
    return this.sessionRepository.find(findOptions);
  }

  async findOne(idOrName: string, apiKey?: ApiKey): Promise<Session> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrName);
    let session: Session | null = null;

    if (isUuid) {
      session = await this.sessionRepository.findOne({ where: { id: idOrName } });
    }
    if (!session) {
      session = await this.sessionRepository.findOne({ where: { name: idOrName } });
    }

    if (!session) {
      throw new NotFoundException(`Session '${idOrName}' not found`);
    }
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN && session.ownerApiKeyId !== apiKey.id) {
      throw new UnauthorizedException('You do not have access to this session');
    }
    return session;
  }

  async findByName(name: string): Promise<Session> {
    return this.findOne(name);
  }

  async delete(idOrName: string): Promise<void> {
    const session = await this.findOne(idOrName);
    const id = session.id;

    // Cancel any reconnection attempts
    this.cancelReconnect(id);

    // Stop engine if running
    const engine = this.engines.get(id);
    if (engine) {
      await engine.destroy();
      this.engines.delete(id);
      this.sessionNameToId.delete(session.name);
    }

    // Execute hook BEFORE delete so plugins can access session data
    await this.hookManager.execute(
      'session:deleted',
      {
        id: session.id,
        name: session.name,
        phone: session.phone,
        pushName: session.pushName,
      },
      {
        sessionId: id,
        source: 'SessionService',
      },
    );

    await this.dataSource.transaction(async manager => {
      await manager.remove(session);
    });
    this.logger.log(`Session deleted: ${session.name}`, {
      sessionId: id,
      action: 'delete',
    });
  }

  async start(idOrName: string): Promise<Session> {
    const session = await this.findOne(idOrName);
    const id = session.id;

    const existingEngine = this.engines.get(id);
    if (existingEngine) {
      const status = typeof existingEngine.getStatus === 'function' ? existingEngine.getStatus() : null;
      if (
        status === EngineStatus.READY ||
        status === EngineStatus.INITIALIZING ||
        status === EngineStatus.AUTHENTICATING ||
        status === EngineStatus.QR_READY
      ) {
        throw new BadRequestException('Session is already started');
      }

      // If existing engine was disconnected or failed, cleanly destroy it before restarting
      try {
        await existingEngine.destroy();
      } catch {
        // ignore
      }
      this.engines.delete(id);
      this.sessionNameToId.delete(session.name);
    }

    // Execute hook before starting
    await this.hookManager.execute(
      'session:starting',
      { sessionId: id },
      {
        sessionId: id,
        source: 'SessionService',
      },
    );

    // Initialize reconnect state with resilient defaults (up to 30 attempts)
    const config = session.config as {
      maxReconnectAttempts?: number;
      reconnectBaseDelay?: number;
    } | null;
    this.reconnectStates.set(id, {
      attempts: 0,
      timer: null,
      maxAttempts: config?.maxReconnectAttempts ?? 30,
      baseDelay: config?.reconnectBaseDelay ?? 5000,
    });

    await this.initializeEngine(id, session);
    return this.findOne(id);
  }

  private async initializeEngine(id: string, session: Session): Promise<void> {
    this.logger.log(`Initializing engine for session: ${session.name}`, {
      sessionId: id,
      action: 'engine_init',
      proxyEnabled: !!session.proxyUrl,
    });

    // Mark session as initializing upfront so that asynchronous transitions to qr_ready or ready are not overwritten
    await this.updateStatus(id, SessionStatus.INITIALIZING);

    const engine = this.engineFactory.create({
      sessionId: session.name,
      proxyUrl: session.proxyUrl || undefined,
      proxyType: session.proxyType || undefined,
    });
    this.engines.set(id, engine);
    this.sessionNameToId.set(session.name, id);

    await engine.initialize({
      onQRCode: (qr: string): void => {
        this.logger.log('QR code generated', {
          sessionId: id,
          action: 'qr_generated',
        });

        // Execute hook for QR event
        void this.hookManager.execute(
          'session:qr',
          { sessionId: id, qrCode: qr },
          {
            sessionId: id,
            source: 'Engine',
          },
        );

        void this.updateStatus(id, SessionStatus.QR_READY);
        this.eventsGateway.emitQRCode(id, qr);
      },
      onReady: (phone: string, pushName: string): void => {
        this.logger.log(`Session ready: ${phone}`, {
          sessionId: id,
          phone,
          pushName,
          action: 'ready',
        });

        // Execute hook for ready event
        void this.hookManager.execute(
          'session:ready',
          { phone, pushName },
          {
            sessionId: id,
            source: 'Engine',
          },
        );

        // Reset reconnect attempts on successful connection
        const reconnectState = this.reconnectStates.get(id);
        if (reconnectState) {
          reconnectState.attempts = 0;
        }

        void this.sessionRepository.update(id, {
          status: SessionStatus.READY,
          phone,
          pushName,
          connectedAt: new Date(),
          lastActiveAt: new Date(),
        });
      },
      onMessage: (message): void => {
        this.logger.debug(`Message received from ${message.from}`, {
          sessionId: id,
          messageId: message.id,
          from: message.from,
          action: 'message_received',
        });
        // Update last active timestamp
        void this.sessionRepository.update(id, { lastActiveAt: new Date() });
        // Convert IncomingMessage to plain object for dispatch
        const messageData = { ...message };

        // Execute hook for message received - plugins can modify or stop processing
        void this.hookManager
          .execute('message:received', messageData, {
            sessionId: id,
            source: 'Engine',
          })
          .then(({ continue: shouldContinue, data: finalMessage }) => {
            if (!shouldContinue) {
              // Plugin stopped processing (e.g., auto-reply handled it)
              return;
            }

            // Dispatch to webhooks with potentially modified message
            void this.webhookService.dispatch(id, 'message.received', finalMessage as Record<string, unknown>);
            // Emit real-time event to WebSocket clients
            this.eventsGateway.emitMessage(id, finalMessage as Record<string, unknown>);
          });
      },
      onDisconnected: (reason: string): void => {
        this.logger.warn(`Session disconnected: ${reason}`, {
          sessionId: id,
          reason,
          action: 'disconnected',
        });

        // Execute hook for disconnected event
        void this.hookManager.execute(
          'session:disconnected',
          { reason },
          {
            sessionId: id,
            source: 'Engine',
          },
        );

        void this.updateStatus(id, SessionStatus.DISCONNECTED);

        // Attempt to reconnect
        this.scheduleReconnect(id, session);
      },
      onStateChanged: (engineState: EngineStatus): void => {
        const statusMap: Record<EngineStatus, SessionStatus> = {
          [EngineStatus.DISCONNECTED]: SessionStatus.DISCONNECTED,
          [EngineStatus.INITIALIZING]: SessionStatus.INITIALIZING,
          [EngineStatus.QR_READY]: SessionStatus.QR_READY,
          [EngineStatus.AUTHENTICATING]: SessionStatus.AUTHENTICATING,
          [EngineStatus.READY]: SessionStatus.READY,
          [EngineStatus.FAILED]: SessionStatus.FAILED,
        };
        const newStatus = statusMap[engineState];
        if (newStatus) {
          void this.updateStatus(id, newStatus);
        }
      },
      onLoadingScreen: (percent: number, message: string): void => {
        const engine = this.engines.get(id);
        if (engine && engine.getStatus() === EngineStatus.READY) {
          return;
        }
        this.eventsGateway.emitSessionStatus(id, SessionStatus.AUTHENTICATING, {
          loadingPercent: percent,
          loadingMessage: message,
        });
      },
    });
  }

  private scheduleReconnect(id: string, session: Session): void {
    const state = this.reconnectStates.get(id);
    if (!state) return;

    if (state.attempts >= state.maxAttempts) {
      this.logger.error(`Max reconnect attempts reached for session: ${session.name}`, undefined, {
        sessionId: id,
        attempts: state.attempts,
        action: 'reconnect_failed',
      });
      return;
    }

    // Smarter backoff capped at 30 seconds with jitter
    const delay = Math.min(state.baseDelay * Math.pow(1.5, state.attempts), 30000) + Math.random() * 1000;
    state.attempts++;

    this.logger.log(
      `Scheduling reconnect attempt ${state.attempts}/${state.maxAttempts} in ${Math.round(delay / 1000)}s`,
      {
        sessionId: id,
        attempt: state.attempts,
        delayMs: delay,
        action: 'reconnect_scheduled',
      },
    );

    state.timer = setTimeout(() => {
      void this.executeReconnect(id, session, state);
    }, delay);
  }

  private async executeReconnect(id: string, session: Session, state: ReconnectState): Promise<void> {
    try {
      // Clean up old engine safely
      const oldEngine = this.engines.get(id);
      if (oldEngine) {
        try {
          await oldEngine.destroy();
        } catch {
          // ignore
        }
        this.engines.delete(id);
        this.sessionNameToId.delete(session.name);
      }

      // Re-initialize
      await this.initializeEngine(id, session);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Reconnect attempt ${state.attempts} failed`, errorMessage, {
        sessionId: id,
        action: 'reconnect_error',
      });
      // Schedule another attempt
      this.scheduleReconnect(id, session);
    }
  }

  private cancelReconnect(id: string): void {
    const state = this.reconnectStates.get(id);
    if (state?.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    this.reconnectStates.delete(id);
  }

  async stop(idOrName: string): Promise<Session> {
    const session = await this.findOne(idOrName);
    const id = session.id;

    // Cancel any reconnection attempts
    this.cancelReconnect(id);

    const engine = this.engines.get(id);

    if (engine) {
      await engine.disconnect();
      this.engines.delete(id);
      this.sessionNameToId.delete(session.name);
    }

    this.logger.log(`Session stopped: ${session.name}`, {
      sessionId: id,
      action: 'stop',
    });
    await this.updateStatus(id, SessionStatus.DISCONNECTED);
    return this.findOne(id);
  }

  async getQRCode(idOrName: string): Promise<{ qrCode: string; status: SessionStatus }> {
    const session = await this.findOne(idOrName);
    const id = session.id;
    let engine = this.engines.get(id);

    // If engine is not running and session is disconnected/created, auto-start it for seamless QR retrieval
    if (!engine && (session.status === SessionStatus.DISCONNECTED || session.status === SessionStatus.CREATED)) {
      this.logger.log(`Auto-starting session '${session.name}' for QR code retrieval`);
      await this.start(id);
      engine = this.engines.get(id);
    }

    if (!engine) {
      throw new BadRequestException('Session is not started. Call POST /sessions/:id/start first.');
    }

    const qrCode = engine.getQRCode();

    if (!qrCode) {
      if (session.status === SessionStatus.READY) {
        throw new BadRequestException('Session is already authenticated, no QR code needed');
      }
      throw new BadRequestException('QR code is not ready yet. Please wait...');
    }

    return {
      qrCode,
      status: session.status,
    };
  }

  getEngine(idOrName: string): IWhatsAppEngine | undefined {
    let engine = this.engines.get(idOrName);
    if (!engine) {
      const canonicalId = this.sessionNameToId.get(idOrName);
      if (canonicalId) {
        engine = this.engines.get(canonicalId);
      }
    }
    return engine;
  }

  async getGroups(idOrName: string): Promise<{ id: string; name: string }[]> {
    const session = await this.findOne(idOrName); // Verify session exists
    const id = session.id;
    const engine = this.getEngine(id);

    if (!engine) {
      throw new BadRequestException('Session is not started');
    }

    const groups = await engine.getGroups();
    return groups.map(g => ({
      id: g.id,
      name: g.name,
    }));
  }

  private async updateStatus(id: string, status: SessionStatus): Promise<void> {
    await this.sessionRepository.update(id, { status });
    this.logger.debug(`Session status updated to ${status}`, {
      sessionId: id,
      status,
      action: 'status_update',
    });
    // Emit real-time event to connected WebSocket clients
    this.eventsGateway.emitSessionStatus(id, status);
  }

  /**
   * Get overall session statistics for multi-session monitoring
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    ready: number;
    disconnected: number;
    byStatus: Record<string, number>;
    memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
  }> {
    const sessions = await this.findAll();
    const byStatus: Record<string, number> = {};

    for (const session of sessions) {
      byStatus[session.status] = (byStatus[session.status] || 0) + 1;
    }

    const memory = process.memoryUsage();

    return {
      total: sessions.length,
      active: this.engines.size,
      ready: byStatus[SessionStatus.READY] || 0,
      disconnected: byStatus[SessionStatus.DISCONNECTED] || 0,
      byStatus,
      memoryUsage: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        rss: Math.round(memory.rss / 1024 / 1024),
      },
    };
  }

  /**
   * Get count of currently active (running) sessions
   */
  getActiveCount(): number {
    return this.engines.size;
  }

  /**
   * Check if session is currently active (engine running)
   */
  isActive(idOrName: string): boolean {
    if (this.engines.has(idOrName)) return true;
    const canonicalId = this.sessionNameToId.get(idOrName);
    return canonicalId ? this.engines.has(canonicalId) : false;
  }

  /**
   * Admin-only adoption: move ownership of an existing session to the current
   * admin key. This preserves the session's WA credentials/QR state.
   */
  async adopt(idOrName: string, apiKey: ApiKey): Promise<Session> {
    const session = await this.findOne(idOrName);
    session.ownerApiKeyId = apiKey.id;
    return this.sessionRepository.save(session);
  }

  /**
   * Admin-only bulk cleanup. Only inactive statuses are allowed; active
   * sessions (ready/qr/authenticating/initializing) are rejected up front.
   */
  async deleteInactive(
    statuses: SessionStatus[],
  ): Promise<{ deleted: number; deletedIds: string[]; statuses: SessionStatus[] }> {
    assertDeletableStatuses(statuses);

    const sessions = await this.sessionRepository.find({
      where: { status: In(statuses) },
      order: { createdAt: 'ASC' },
    });

    const deletedIds: string[] = [];
    for (const session of sessions) {
      // Double guard: never delete an active engine or an active status.
      if (this.isActive(session.id) || !INACTIVE_SESSION_STATUSES.has(session.status)) {
        continue;
      }
      await this.delete(session.id);
      deletedIds.push(session.id);
    }

    return { deleted: deletedIds.length, deletedIds, statuses };
  }
}
