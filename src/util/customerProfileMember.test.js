import { createIntl, createIntlCache } from './reactIntl';
import { resolveCustomerLevelLabel } from './customerProfileMember';

const cache = createIntlCache();
const intl = createIntl(
  {
    locale: 'en',
    messages: {
      'ProfilePage.memberLevel_beginner': 'Beginner',
      'ProfilePage.memberLevel_intermediate': 'Intermediate',
      'ProfilePage.memberLevel_advanced': 'Advanced',
      'ProfilePage.memberLevel_expert': 'Expert',
    },
  },
  cache
);

describe('resolveCustomerLevelLabel', () => {
  it('returns null when no level is set', () => {
    expect(resolveCustomerLevelLabel(intl, {})).toBeNull();
  });

  it('resolves known level tokens from publicData', () => {
    expect(resolveCustomerLevelLabel(intl, { level: 'intermediate' })).toBe('Intermediate');
    expect(resolveCustomerLevelLabel(intl, { skillLevel: 'expert' })).toBe('Expert');
  });

  it('title-cases unknown custom level values', () => {
    expect(resolveCustomerLevelLabel(intl, { level: 'park_rat' })).toBe('Park Rat');
  });
});
