import {
  applyPrimarySportSelectionChange,
  coachPrimarySportFormValueToPublicData,
  getCoachDashboardBackgroundImage,
  getCoachManualSportsFormValue,
  getCoachOfferedSports,
  getCoachPrimarySportFormValue,
  mergeManualAndPrimarySports,
  normalizeCoachOfferedSportsFormValue,
  resolveCoachPrimarySportKey,
  updateManualSportsFromCheckboxChange,
} from './coachPrimarySport';
import {
  consumePrimaryDrivenSportsUpdate,
  markPrimaryDrivenSportsUpdate,
} from './coachPrimarySportFormSyncState';

describe('coachPrimarySport', () => {
  it('resolves stored primary sport when it is still offered', () => {
    const publicData = { sports: ['surf', 'climbing'], primarySport: 'climbing' };
    expect(resolveCoachPrimarySportKey(publicData)).toBe('climbing');
    expect(getCoachPrimarySportFormValue(publicData)).toBe('climbing');
  });

  it('falls back to the first offered sport when primary is missing or invalid', () => {
    expect(resolveCoachPrimarySportKey({ sports: ['mtb', 'surf'] })).toBe('mtb');
    expect(
      resolveCoachPrimarySportKey({ sports: ['mtb', 'surf'], primarySport: 'tennis' })
    ).toBe('mtb');
    expect(getCoachPrimarySportFormValue({ sports: ['mtb', 'surf'] })).toBe('');
  });

  it('derives manual sports by excluding the stored primary sport', () => {
    expect(
      getCoachManualSportsFormValue({ sports: ['surf', 'mtb'], primarySport: 'surf' })
    ).toEqual(['mtb']);
    expect(getCoachManualSportsFormValue({ sports: ['surf'], primarySport: 'surf' })).toEqual([]);
  });

  it('merges manual sports with the current primary sport only', () => {
    expect(mergeManualAndPrimarySports(['mtb'], 'climbing')).toEqual(['mtb', 'climbing']);
    expect(mergeManualAndPrimarySports([], 'surf')).toEqual(['surf']);
  });

  it('replaces auto-added primary sport without keeping previous primary selections', () => {
    expect(applyPrimarySportSelectionChange({ manual: [], nextPrimary: 'surf' })).toEqual({
      manual: [],
      sports: ['surf'],
    });
    expect(applyPrimarySportSelectionChange({ manual: [], nextPrimary: 'mtb' })).toEqual({
      manual: [],
      sports: ['mtb'],
    });
    expect(applyPrimarySportSelectionChange({ manual: [], nextPrimary: 'climbing' })).toEqual({
      manual: [],
      sports: ['climbing'],
    });
    expect(
      coachPrimarySportFormValueToPublicData('mtb', ['surf', 'mtb'], [])
    ).toEqual({ primarySport: 'mtb', sports: ['mtb'] });
  });

  it('does not add the current primary sport into manual sports on checkbox sync', () => {
    expect(
      updateManualSportsFromCheckboxChange({
        previousManual: [],
        previousSports: [],
        nextSports: ['surf'],
        primary: 'surf',
      })
    ).toEqual({
      manual: [],
      clearPrimary: false,
      reconciledSports: ['surf'],
    });
  });

  it('consumes pending primary-driven sports updates once', () => {
    markPrimaryDrivenSportsUpdate(['mtb']);
    expect(consumePrimaryDrivenSportsUpdate(['mtb'])).toBe(true);
    expect(consumePrimaryDrivenSportsUpdate(['mtb'])).toBe(false);
  });

  it('keeps manually selected sports when primary sport changes', () => {
    expect(
      coachPrimarySportFormValueToPublicData('climbing', ['surf', 'mtb', 'climbing'], ['surf', 'mtb'])
    ).toEqual({ primarySport: 'climbing', sports: ['surf', 'mtb', 'climbing'] });
  });

  it('updates manual sports when a checkbox is toggled', () => {
    expect(
      updateManualSportsFromCheckboxChange({
        previousManual: [],
        previousSports: ['surf'],
        nextSports: ['surf', 'mtb'],
        primary: 'surf',
      })
    ).toEqual({
      manual: ['mtb'],
      clearPrimary: false,
      reconciledSports: ['mtb', 'surf'],
    });
  });

  it('clears primary when the current primary sport is unchecked manually', () => {
    expect(
      updateManualSportsFromCheckboxChange({
        previousManual: [],
        previousSports: ['surf'],
        nextSports: [],
        primary: 'surf',
      })
    ).toEqual({
      manual: [],
      clearPrimary: true,
      reconciledSports: [],
    });
  });

  it('clears primary and sports when none remain', () => {
    expect(coachPrimarySportFormValueToPublicData('', [], [])).toEqual({
      primarySport: null,
      sports: null,
    });
  });

  it('returns dashboard background image for resolved primary sport', () => {
    const image = getCoachDashboardBackgroundImage({ sports: ['surf'], primarySport: 'surf' });
    expect(image).toContain('/CoachPagePic/');
  });

  it('returns null dashboard background when no sports exist', () => {
    expect(getCoachDashboardBackgroundImage({})).toBeNull();
  });

  it('normalizes offered sports from form values', () => {
    expect(normalizeCoachOfferedSportsFormValue([' Surf ', 'surf', 'MTB'])).toEqual(['surf', 'mtb']);
    expect(getCoachOfferedSports({ sports: ['freerideskiing', 'ski'] })).toEqual([
      'freerideskiing',
      'ski',
    ]);
  });
});
