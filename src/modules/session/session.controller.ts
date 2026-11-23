import { Controller, Get, Post, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { CleanupInactiveSessionsDto, CreateSessionDto, SessionResponseDto, QRCodeResponseDto } from './dto';
import { Session, SessionStatus } from './entities/session.entity';
import { EngineStatus } from '../../engine/interfaces/whatsapp-engine.interface';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { RequireRole, CurrentApiKey } from '../auth/decorators/auth.decorators';
import { ApiKey, ApiKeyRole } from '../auth/entities/api-key.entity';

@ApiTags('sessions')
@Controller('sessions')
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
  ) {}

  // Transform entity to DTO with lastActive field name
  private transformSession(session: Session): SessionResponseDto {
    return {
      id: session.id,
      ownerApiKeyId: session.ownerApiKeyId,
      name: session.name,
      status: session.status,
      phone: session.phone,
      pushName: session.pushName,
      connectedAt: session.connectedAt,
      lastActive: session.lastActiveAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  @Post()
  @RequireRole(ApiKeyRole.USER)
  @ApiOperation({ summary: 'Create a new WhatsApp session' })
  @ApiResponse({
    status: 201,
    description: 'Session created',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Session name already exists' })
  async create(
    @Body() dto: CreateSessionDto,
    @CurrentApiKey() apiKey: ApiKey,
  ): Promise<Session> {
    const session = await this.sessionService.create(dto, apiKey);
    await this.auditService.logInfo(AuditAction.SESSION_CREATED, {
      sessionId: session.id,
      sessionName: session.name,
    });
    return session;
  }

  @Get()
  @ApiOperation({ summary: 'List all sessions' })
  @ApiResponse({
    status: 200,
    description: 'List of sessions',
    type: [SessionResponseDto],
  })
  async findAll(@CurrentApiKey() apiKey: ApiKey): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionService.findAll(apiKey);
    return sessions.map(s => this.transformSession(s));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session details',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: ApiKey,
  ): Promise<SessionResponseDto> {
    const session = await this.sessionService.findOne(id, apiKey);
    return this.transformSession(session);
  }

  @Delete(':id')
  @RequireRole(ApiKeyRole.USER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 204, description: 'Session deleted' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async delete(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: ApiKey,
  ): Promise<void> {
    const session = await this.sessionService.findOne(id, apiKey);
    await this.sessionService.delete(id);
    await this.auditService.logInfo(AuditAction.SESSION_DELETED, {
      apiKey,
      sessionId: id,
      sessionName: session.name,
    });
  }

  @Post('inactive/cleanup')
  @RequireRole(ApiKeyRole.ADMIN)
  @ApiOperation({ summary: 'Delete inactive sessions (admin only)' })
  @ApiResponse({ status: 200, description: 'Inactive sessions deleted' })
  async deleteInactive(
    @Body() body: CleanupInactiveSessionsDto,
    @CurrentApiKey() apiKey: ApiKey,
  ): Promise<{ deleted: number; deletedIds: string[]; statuses: SessionStatus[] }> {
    const statuses = body.statuses?.length
      ? body.statuses
      : [SessionStatus.CREATED, SessionStatus.IDLE, SessionStatus.DISCONNECTED, SessionStatus.FAILED];

    const result = await this.sessionService.deleteInactive(statuses);
    await this.auditService.logInfo(AuditAction.SESSION_BULK_DELETED, {
      apiKey,
      metadata: {
        deleted: result.deleted,
        statuses: result.statuses,
        deletedIds: result.deletedIds,
      },
    });
    return result;
  }

  @Post(':id/adopt')
  @RequireRole(ApiKeyRole.ADMIN)
  @ApiOperation({ summary: 'Adopt an existing session (admin only)' })
  @ApiParam({ name: 'id', description: 'Session ID or name' })
  @ApiResponse({ status: 200, description: 'Session adopted', type: SessionResponseDto })
  async adopt(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: ApiKey,
  ): Promise<SessionResponseDto> {
    const session = await this.sessionService.adopt(id, apiKey);
    await this.auditService.logInfo(AuditAction.SESSION_ADOPTED, {
      apiKey,
      sessionId: session.id,
      sessionName: session.name,
      metadata: { newOwnerApiKeyId: apiKey.id },
    });
    return this.transformSession(session);
  }

  @Post(':id/start')
  @RequireRole(ApiKeyRole.USER)
  @ApiOperation({
    summary: 'Start a session and initialize WhatsApp connection',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session started',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Session already started' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async start(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: ApiKey,
  ): Promise<SessionResponseDto> {
    await this.sessionService.findOne(id, apiKey);
    const session = await this.sessionService.start(id);
    await this.auditService.logInfo(AuditAction.SESSION_STARTED, {
      sessionId: session.id,
      sessionName: session.name,
    });
    return this.transformSession(session);
  }

  @Post(':id/stop')
  @RequireRole(ApiKeyRole.USER)
  @ApiOperation({ summary: 'Stop a session and disconnect WhatsApp' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session stopped',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async stop(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: ApiKey,
  ): Promise<SessionResponseDto> {
    await this.sessionService.findOne(id, apiKey);
    const session = await this.sessionService.stop(id);
    await this.auditService.logInfo(AuditAction.SESSION_STOPPED, {
      sessionId: session.id,
      sessionName: session.name,
    });
    return this.transformSession(session);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Get QR code for session authentication' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'QR code data',
    type: QRCodeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'QR code not ready or session already authenticated',
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getQRCode(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: ApiKey,
  ): Promise<QRCodeResponseDto> {
    await this.sessionService.findOne(id, apiKey);
    const qrCode = await this.sessionService.getQRCode(id);
    await this.auditService.logInfo(AuditAction.SESSION_QR_GENERATED, {
      sessionId: id,
    });
    return qrCode;
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get lightweight session connection status for client polling' })
  @ApiParam({ name: 'id', description: 'Session ID (UUID) or Session Name' })
  @ApiResponse({
    status: 200,
    description: 'Lightweight session connection status',
  })
  async getStatus(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: ApiKey,
  ) {
    const session = await this.sessionService.findOne(id, apiKey);
    const engine = this.sessionService.getEngine(session.id);
    const engineStatus = engine ? engine.getStatus() : null;

    let connectionStatus = 'disconnected';
    if (session.status === SessionStatus.READY || engineStatus === EngineStatus.READY) {
      connectionStatus = 'connected';
    } else if (session.status === SessionStatus.QR_READY || engineStatus === EngineStatus.QR_READY) {
      connectionStatus = 'scanning';
    } else if (session.status === SessionStatus.AUTHENTICATING || engineStatus === EngineStatus.AUTHENTICATING) {
      connectionStatus = 'authenticating';
    } else if (session.status === SessionStatus.INITIALIZING || engineStatus === EngineStatus.INITIALIZING) {
      connectionStatus = 'initializing';
    } else if (session.status === SessionStatus.FAILED || engineStatus === EngineStatus.FAILED) {
      connectionStatus = 'failed';
    }

    return {
      status: connectionStatus,
      rawStatus: session.status,
      sessionId: session.id,
      name: session.name,
      phone: session.phone,
      pushName: session.pushName,
      connected: connectionStatus === 'connected',
    };
  }

  @Get(':id/groups')
  @ApiOperation({ summary: 'Get all groups for a session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'List of groups the session is a member of',
  })
  @ApiResponse({ status: 400, description: 'Session not ready' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getGroups(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: ApiKey,
  ): Promise<{ id: string; name: string }[]> {
    await this.sessionService.findOne(id, apiKey);
    return this.sessionService.getGroups(id);
  }

  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get session statistics for multi-session monitoring',
  })
  @ApiResponse({
    status: 200,
    description: 'Session statistics including counts and memory usage',
  })
  async getStats(): Promise<{
    total: number;
    active: number;
    ready: number;
    disconnected: number;
    byStatus: Record<string, number>;
    memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
  }> {
    return this.sessionService.getStats();
  }
}
