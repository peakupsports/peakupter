import { addScopePrefix, getPropsForCustomUserFieldInputs } from '../util/userHelpers';
import {
  PEAKUP_COACH_PROFILE_COUNTRY_KEY,
  peakUpCoachUserFields,
} from './configPeakUpCoachUserFields';

const mergeUserFieldsByKey = (...fieldGroups) => {
  const map = new Map();
  fieldGroups.flat().forEach(field => map.set(field.key, field));
  return [...map.values()];
};

describe('configPeakUpCoachUserFields country', () => {
  const hostedCountryProviderOnly = {
    key: 'country',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [{ option: 'CH', label: 'Switzerland' }],
    saveConfig: {
      label: 'Country (hosted)',
      displayInSignUp: false,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['provider'],
    },
  };

  it('exposes country for instructor user type after merge', () => {
    const merged = mergeUserFieldsByKey([hostedCountryProviderOnly], peakUpCoachUserFields);
    const props = getPropsForCustomUserFieldInputs(merged, 'instructor', false);
    const countryKey = addScopePrefix('public', PEAKUP_COACH_PROFILE_COUNTRY_KEY);

    expect(props.some(p => p.key === countryKey)).toBe(true);
  });

  it('local country config overrides hosted user-type restriction', () => {
    const merged = mergeUserFieldsByKey([hostedCountryProviderOnly], peakUpCoachUserFields);
    const countryField = merged.find(f => f.key === PEAKUP_COACH_PROFILE_COUNTRY_KEY);

    expect(countryField?.userTypeConfig?.limitToUserTypeIds).toBe(false);
    expect(countryField?.enumOptions?.length).toBeGreaterThan(100);
  });
});
