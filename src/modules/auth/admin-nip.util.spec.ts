import { isAdminNip } from './admin-nip.util';

describe('isAdminNip', () => {
  it('returns false when NIP is missing', () => {
    expect(isAdminNip(null, '340058069')).toBe(false);
    expect(isAdminNip(undefined, '340058069')).toBe(false);
  });

  it('returns false when the allowlist is not configured', () => {
    expect(isAdminNip('340058069', undefined)).toBe(false);
    expect(isAdminNip('340058069', '')).toBe(false);
  });

  it('matches a NIP in the allowlist and ignores whitespace', () => {
    expect(isAdminNip('340058069', ' 340058069 ')).toBe(true);
    expect(isAdminNip('340058069', '340058068, 340058069')).toBe(true);
  });

  it('rejects a NIP that is not listed', () => {
    expect(isAdminNip('340000000', '340058069')).toBe(false);
  });
});
