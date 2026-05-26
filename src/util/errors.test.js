import {
  BOOKING_LOAD_ERROR_FALLBACK,
  getReadableErrorMessage,
  storableError,
  toErrorInstance,
} from './errors';

describe('errors', () => {
  describe('getReadableErrorMessage', () => {
    it('returns fallback for object message that stringifies to [object Object]', () => {
      expect(getReadableErrorMessage({ message: {} })).toBe(BOOKING_LOAD_ERROR_FALLBACK);
    });

    it('reads API error detail from data.errors', () => {
      expect(
        getReadableErrorMessage({
          data: { errors: [{ title: 'Listing not found', detail: 'The listing was closed.' }] },
        })
      ).toBe('The listing was closed.');
    });
  });

  describe('storableError', () => {
    it('never stores [object Object] as message', () => {
      const stored = storableError({ message: { code: 'x' } });
      expect(stored.message).not.toBe('[object Object]');
      expect(typeof stored.message).toBe('string');
      expect(stored.message.length).toBeGreaterThan(0);
    });
  });

  describe('toErrorInstance', () => {
    it('wraps plain objects as Error with readable message', () => {
      const err = toErrorInstance({ statusText: 'Forbidden' });
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Forbidden');
    });
  });
});
