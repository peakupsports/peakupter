import {
  buildAmbassadorShareLink,
  formatAmbassadorShareLinkDisplay,
  getAmbassadorShareDomain,
  getCoachInitials,
} from './referralCenter';

describe('referralCenter', () => {
  describe('getAmbassadorShareDomain', () => {
    it('defaults to peakup.com when config is localhost', () => {
      expect(getAmbassadorShareDomain({ marketplaceRootURL: 'http://localhost:3000' })).toBe(
        'peakup.com'
      );
    });

    it('uses production marketplace root when not localhost', () => {
      expect(getAmbassadorShareDomain({ marketplaceRootURL: 'https://www.peakup.com' })).toBe(
        'www.peakup.com'
      );
    });
  });

  describe('buildAmbassadorShareLink', () => {
    it('builds join URL with ref query', () => {
      expect(buildAmbassadorShareLink('ABC123')).toBe('https://peakup.com/join?ref=ABC123');
    });

    it('encodes special characters in code', () => {
      expect(buildAmbassadorShareLink('A B')).toBe('https://peakup.com/join?ref=A%20B');
    });
  });

  describe('formatAmbassadorShareLinkDisplay', () => {
    it('returns protocol-free display URL', () => {
      expect(formatAmbassadorShareLinkDisplay('ABC123')).toBe('peakup.com/join?ref=ABC123');
    });
  });

  describe('getCoachInitials', () => {
    it('returns initials from full name', () => {
      expect(getCoachInitials('Alex Rivera')).toBe('AR');
    });

    it('returns ? for empty name', () => {
      expect(getCoachInitials('')).toBe('?');
    });
  });
});
