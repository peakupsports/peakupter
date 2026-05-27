import { PEAKUP_COACH_PROFILE_LANGUAGE_KEY } from '../config/configPeakUpCoachUserFields';

import {
  coachLanguagesFromProfilePublicData,
  normalizePeakupPreBookingDetails,
  resolvePreBookingLanguageOptions,
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

  it('coachLanguagesFromProfilePublicData reads Profile Settings publicData key', () => {
    expect(PEAKUP_COACH_PROFILE_LANGUAGE_KEY).toBe('languages');
    expect(
      coachLanguagesFromProfilePublicData({ [PEAKUP_COACH_PROFILE_LANGUAGE_KEY]: ['it', 'en', 'de'] })
    ).toEqual(['it', 'en', 'de']);
    expect(coachLanguagesFromProfilePublicData({})).toEqual([]);
  });

  it('resolvePreBookingLanguageOptions uses coach Profile Settings languages only', () => {
    const author = {
      id: { uuid: 'coach-1' },
      attributes: {
        profile: {
          publicData: {
            [PEAKUP_COACH_PROFILE_LANGUAGE_KEY]: ['it', 'en', 'de'],
          },
        },
      },
    };
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const options = resolvePreBookingLanguageOptions(intl, author);
    expect(options.map(o => o.value)).toEqual(['de', 'en', 'it']);
    expect(logSpy).toHaveBeenCalledWith(
      '[PeakUp PREBOOKING LANGUAGES]',
      expect.objectContaining({
        authorId: 'coach-1',
        resolvedLanguages: ['it', 'en', 'de'],
      })
    );
    logSpy.mockRestore();
  });

  it('normalizePeakupPreBookingDetails returns structured payload', () => {
    const sportOptions = [{ value: 'ski', label: 'Ski' }];
    const languageOptions = [{ value: 'en', label: 'English' }];
    const result = normalizePeakupPreBookingDetails(
      {
        sport: 'ski',
        participantType: 'self',
        skillLevel: 'intermediate',
        sessionLanguage: 'en',
        participantCount: '2',
      },
      sportOptions,
      languageOptions
    );
    expect(result).toEqual({
      sport: 'ski',
      sportLabel: 'Ski',
      participantType: 'self',
      skillLevel: 'intermediate',
      sessionLanguage: 'en',
      sessionLanguageLabel: 'English',
      participantCount: 2,
    });
  });

  it('normalizePeakupPreBookingDetails requires session language when coach offers languages', () => {
    const sportOptions = [{ value: 'ski', label: 'Ski' }];
    const languageOptions = [{ value: 'en', label: 'English' }];
    expect(
      normalizePeakupPreBookingDetails(
        {
          sport: 'ski',
          participantType: 'self',
          skillLevel: 'intermediate',
          participantCount: '1',
        },
        sportOptions,
        languageOptions
      )
    ).toBeNull();
  });

  it('normalizePeakupPreBookingDetails rejects incomplete values', () => {
    expect(normalizePeakupPreBookingDetails({ sport: 'ski' }, [])).toBeNull();
  });
});
