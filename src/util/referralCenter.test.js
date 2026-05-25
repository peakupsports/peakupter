import {
  buildAmbassadorShareLink,
  formatAmbassadorShareLinkDisplay,
  getAmbassadorShareDomain,
  getAmbassadorShareOrigin,
  getCoachInitials,
  PRODUCTION_AMBASSADOR_HOST,
  resolveAmbassadorShareOrigin,
} from './referralCenter';

describe('referralCenter', () => {
  const localWindow = { location: { origin: 'http://localhost:3000', hostname: 'localhost' } };
  const prodWindow = {
    location: { origin: `https://${PRODUCTION_AMBASSADOR_HOST}`, hostname: PRODUCTION_AMBASSADOR_HOST },
  };

  describe('resolveAmbassadorShareOrigin', () => {
    it('uses localhost origin when running on localhost', () => {
      expect(resolveAmbassadorShareOrigin({}, localWindow)).toBe('http://localhost:3000');
    });

    it('uses production origin when running on peakup.ch', () => {
      expect(resolveAmbassadorShareOrigin({}, prodWindow)).toBe(`https://${PRODUCTION_AMBASSADOR_HOST}`);
    });

    it('uses localhost from config when window is unavailable', () => {
      expect(resolveAmbassadorShareOrigin({ marketplaceRootURL: 'http://localhost:3000' }, null)).toBe(
        'http://localhost:3000'
      );
    });

    it('defaults to production peakup.ch when window is unavailable', () => {
      expect(resolveAmbassadorShareOrigin({}, null)).toBe(`https://${PRODUCTION_AMBASSADOR_HOST}`);
    });
  });

  describe('getAmbassadorShareDomain', () => {
    it('returns host from share origin', () => {
      expect(getAmbassadorShareDomain()).toBeDefined();
    });
  });

  describe('buildAmbassadorShareLink', () => {
    it('builds coach-signup URL with ref query in production', () => {
      expect(buildAmbassadorShareLink('ABC123', {}, prodWindow)).toBe(
        `https://${PRODUCTION_AMBASSADOR_HOST}/coach-signup?ref=ABC123`
      );
    });

    it('builds localhost coach-signup URL when running locally', () => {
      expect(buildAmbassadorShareLink('GiangioPKUP01', {}, localWindow)).toBe(
        'http://localhost:3000/coach-signup?ref=GiangioPKUP01'
      );
    });

    it('encodes special characters in code', () => {
      expect(buildAmbassadorShareLink('A B', {}, prodWindow)).toBe(
        `https://${PRODUCTION_AMBASSADOR_HOST}/coach-signup?ref=A%20B`
      );
    });
  });

  describe('formatAmbassadorShareLinkDisplay', () => {
    it('returns protocol-free display URL', () => {
      expect(formatAmbassadorShareLinkDisplay('ABC123', {}, prodWindow)).toBe(
        `${PRODUCTION_AMBASSADOR_HOST}/coach-signup?ref=ABC123`
      );
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
