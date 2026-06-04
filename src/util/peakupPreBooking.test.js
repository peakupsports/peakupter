import { PEAKUP_COACH_PROFILE_LANGUAGE_KEY } from '../config/configPeakUpCoachUserFields';

import {
  coachLanguagesFromProfilePublicData,
  normalizePeakupPreBookingDetails,
  resolvePreBookingInitialSport,
  resolvePreBookingLanguageOptions,
  resolvePreBookingSportOptions,
  resolvePreBookingSportOptionsForListing,
} from './peakupPreBooking';

const intl = {
  formatMessage: ({ id, defaultMessage }) => defaultMessage || id,
};

describe('peakupPreBooking', () => {
  it('resolvePreBookingSportOptionsForListing reads categoryLevel1 as listing sport', () => {
    const listing = {
      id: { uuid: 'listing-skydive' },
      attributes: {
        title: 'Tandem Sky Diving',
        publicData: { categoryLevel1: 'skydiving' },
      },
    };
    const author = {
      attributes: {
        profile: {
          publicData: { sports: ['surf', 'tennis', 'ski'] },
        },
      },
    };
    const options = resolvePreBookingSportOptionsForListing(intl, listing, author);
    expect(options.map(o => o.value)).toEqual(['skydive']);
    expect(resolvePreBookingInitialSport(options)).toBe('skydive');
  });

  it('resolvePreBookingSportOptionsForListing canonicalizes listing sport aliases', () => {
    const listing = {
      attributes: {
        publicData: { sports: ['skydiving'] },
      },
    };
    const options = resolvePreBookingSportOptionsForListing(intl, listing, null);
    expect(options.map(o => o.value)).toEqual(['skydive']);
    expect(options[0].label).toBe('Skydive');
  });

  it('resolvePreBookingInitialSport preselects when listing has one sport', () => {
    expect(
      resolvePreBookingInitialSport([{ value: 'skydive', label: 'Skydive' }])
    ).toBe('skydive');
    expect(
      resolvePreBookingInitialSport([{ value: 'tennis', label: 'Tennis' }])
    ).toBe('tennis');
    expect(resolvePreBookingInitialSport([])).toBe('');
    expect(
      resolvePreBookingInitialSport([
        { value: 'ski', label: 'Ski' },
        { value: 'snowboard', label: 'Snowboard' },
      ])
    ).toBe('');
  });

  it('resolvePreBookingSportOptionsForListing with multiple listing sports only', () => {
    const listing = {
      attributes: {
        publicData: { sports: ['ski', 'snowboard'] },
      },
    };
    const author = {
      attributes: {
        profile: { publicData: { sports: ['tennis', 'golf'] } },
      },
    };
    const options = resolvePreBookingSportOptionsForListing(intl, listing, author);
    expect(options.map(o => o.value).sort()).toEqual(['ski', 'snowboard']);
  });

  it('resolvePreBookingSportOptionsForListing falls back to coach profile when listing has no sports', () => {
    const listing = { attributes: { publicData: {} } };
    const author = {
      attributes: {
        profile: { publicData: { sports: ['tennis', 'golf'] } },
      },
    };
    const options = resolvePreBookingSportOptionsForListing(intl, listing, author);
    expect(options.map(o => o.value).sort()).toEqual(['golf', 'tennis']);
  });

  it('resolvePreBookingSportOptionsForListing canonicalizes mountain biking to mtb', () => {
    const listing = {
      attributes: {
        publicData: { sports: ['mountain-biking'] },
      },
    };
    const options = resolvePreBookingSportOptionsForListing(intl, listing, null);
    expect(options.map(o => o.value)).toEqual(['mtb']);
    expect(resolvePreBookingInitialSport(options)).toBe('mtb');
  });

  it('resolvePreBookingSportOptionsForListing uses listing sports only when present', () => {
    const listing = {
      attributes: {
        publicData: { sports: ['ski'] },
      },
    };
    const author = {
      attributes: {
        profile: {
          publicData: {
            sports: ['snowboard', 'ski'],
          },
        },
      },
    };
    const options = resolvePreBookingSportOptionsForListing(intl, listing, author);
    expect(options.map(o => o.value)).toEqual(['ski']);
  });

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
