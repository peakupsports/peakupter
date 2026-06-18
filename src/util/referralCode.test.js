import {
  hasReferralCodeValue,
  normalizeReferralCode,
  referralCodesMatch,
} from './referralCode';

describe('referralCode', () => {
  it('normalizes codes to uppercase', () => {
    expect(normalizeReferralCode(' giangiopkup01 ')).toBe('GIANGIOPKUP01');
    expect(normalizeReferralCode('GianLucaPKUP01')).toBe('GIANLUCAPKUP01');
  });

  it('treats empty values as blank', () => {
    expect(normalizeReferralCode('')).toBe('');
    expect(normalizeReferralCode(null)).toBe('');
    expect(hasReferralCodeValue('')).toBe(false);
    expect(hasReferralCodeValue('CODE01')).toBe(true);
  });

  it('matches codes case-insensitively', () => {
    expect(referralCodesMatch('giangiopkup01', 'GIANGIOPKUP01')).toBe(true);
    expect(referralCodesMatch('CODE01', 'CODE02')).toBe(false);
  });
});
