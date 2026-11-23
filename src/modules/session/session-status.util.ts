import { BadRequestException } from '@nestjs/common';
import { SessionStatus } from './entities/session.entity';

/**
 * Inactive statuses are safe to delete in bulk. "Safe" means the session is
 * not in the middle of connecting or already connected to WhatsApp.
 */
export const INACTIVE_SESSION_STATUSES: ReadonlySet<SessionStatus> = new Set([
  SessionStatus.CREATED,
  SessionStatus.IDLE,
  SessionStatus.DISCONNECTED,
  SessionStatus.FAILED,
]);

export const ACTIVE_SESSION_STATUSES: ReadonlySet<SessionStatus> = new Set([
  SessionStatus.INITIALIZING,
  SessionStatus.QR_READY,
  SessionStatus.AUTHENTICATING,
  SessionStatus.READY,
]);

export function assertDeletableStatuses(statuses: SessionStatus[]): void {
  if (statuses.length === 0) {
    throw new BadRequestException('At least one status is required');
  }

  const invalid = statuses.filter(status => !INACTIVE_SESSION_STATUSES.has(status));
  if (invalid.length > 0) {
    throw new BadRequestException(
      `Refusing to delete active sessions. Allowed statuses: ${Array.from(INACTIVE_SESSION_STATUSES).join(', ')}. Invalid: ${invalid.join(', ')}`,
    );
  }
}
