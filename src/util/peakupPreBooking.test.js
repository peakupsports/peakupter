import {
  normalizePeakupPreBookingDetails,
  resolvePreBookingSportOptions,
} from './peakupPreBooking';

const intl = {
  formatMessage: ({ id, defaultMessage }) => defaultMessage || id,
};

describe('peakupPreBooking', () => {
  it('resolvePreBookingSportOptions includes main sports and variants', () => {
    const author = {
      attributes: {
        profile: {
          publicData: {
            sports: ['snowboard', 'freeridesnowboard', 'freestylesnowboard', 'splittouring'],
          },
        },
      },
    };
    const options = resolvePreBookingSportOptions(intl, null, author);
    const values = options.map(o => o.value);
    expect(values).toEqual(
      expect.arrayContaining(['snowboard', 'freeridesnowboard', 'freestylesnowboard', 'splittouring'])
    );
    const freeride = options.find(o => o.value === 'freeridesnowboard');
    expect(freeride?.label).toBe('Freeride snowboard');
  });

  it('normalizePeakupPreBookingDetails returns structured payload', () => {
    const sportOptions = [{ value: 'ski', label: 'Ski' }];
    const result = normalizePeakupPreBookingDetails(
      {
        sport: 'ski',
        participantType: 'self',
        skillLevel: 'intermediate',
        participantCount: '2',
      },
      sportOptions
    );
    expect(result).toEqual({
      sport: 'ski',
      sportLabel: 'Ski',
      participantType: 'self',
      skillLevel: 'intermediate',
      participantCount: 2,
    });
  });

  it('normalizePeakupPreBookingDetails rejects incomplete values', () => {
    expect(normalizePeakupPreBookingDetails({ sport: 'ski' }, [])).toBeNull();
  });
});
