import { buildTeamSinceYearOptions } from './FieldTeamSinceYear';
import {
  getTeamPrimarySportFormValue,
  getTeamSecondarySportFormValue,
  teamIdentitySportsFormValuesToPublicData,
} from '../../../util/peakupTeam';

describe('FieldTeamSinceYear', () => {
  it('builds year options from current year down to 1950', () => {
    const currentYear = new Date().getFullYear();
    const options = buildTeamSinceYearOptions();
    expect(options[0]).toEqual({ value: String(currentYear), label: String(currentYear) });
    expect(options[options.length - 1]).toEqual({ value: '1950', label: '1950' });
    expect(options).toHaveLength(currentYear - 1950 + 1);
  });
});

describe('team identity sport helpers', () => {
  it('reads primary and secondary from teamSports', () => {
    expect(getTeamPrimarySportFormValue({ teamSports: ['snowboard', 'splittouring'] })).toBe(
      'snowboard'
    );
    expect(getTeamSecondarySportFormValue({ teamSports: ['snowboard', 'splittouring'] })).toBe(
      'splittouring'
    );
  });

  it('writes deduped teamSports array', () => {
    expect(teamIdentitySportsFormValuesToPublicData('surf', 'yoga')).toEqual({
      teamSports: ['surf', 'yoga'],
    });
    expect(teamIdentitySportsFormValuesToPublicData('ski', '')).toEqual({ teamSports: ['ski'] });
    expect(teamIdentitySportsFormValuesToPublicData('mtb', 'mtb')).toEqual({ teamSports: ['mtb'] });
  });
});
