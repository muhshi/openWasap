import { BadRequestException } from '@nestjs/common';
import { SessionStatus } from './entities/session.entity';
import {
  ACTIVE_SESSION_STATUSES,
  INACTIVE_SESSION_STATUSES,
  assertDeletableStatuses,
} from './session-status.util';

describe('session-status.util', () => {
  it('allows every inactive status', () => {
    const statuses = [
      SessionStatus.CREATED,
      SessionStatus.IDLE,
      SessionStatus.DISCONNECTED,
      SessionStatus.FAILED,
    ];

    expect(() => assertDeletableStatuses(statuses)).not.toThrow();
    statuses.forEach(status => expect(INACTIVE_SESSION_STATUSES.has(status)).toBe(true));
  });

  it.each([
    SessionStatus.INITIALIZING,
    SessionStatus.QR_READY,
    SessionStatus.AUTHENTICATING,
    SessionStatus.READY,
  ])('refuses to delete active status %s', status => {
    expect(ACTIVE_SESSION_STATUSES.has(status)).toBe(true);
    expect(() => assertDeletableStatuses([status])).toThrow(BadRequestException);
  });

  it('refuses an empty status list', () => {
    expect(() => assertDeletableStatuses([])).toThrow(BadRequestException);
  });

  it('refuses a mix of inactive and active statuses', () => {
    expect(() =>
      assertDeletableStatuses([SessionStatus.DISCONNECTED, SessionStatus.READY]),
    ).toThrow(BadRequestException);
  });
});
