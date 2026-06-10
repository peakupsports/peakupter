import { createIntl, createIntlCache } from '../../util/reactIntl';
import messages from '../../translations/en.json';

import { buildInstructorsPageData } from './buildInstructorsPageData';
import { INSTRUCTORS_COACH_SIGNUP_PATH } from './instructorsContent';

const intl = createIntl({ locale: 'en', messages }, createIntlCache());

describe('buildInstructorsPageData', () => {
  it('builds three localized sections with coach signup CTAs', () => {
    const data = buildInstructorsPageData(intl, { marketplaceName: 'PeakUp' });

    expect(data.sections).toHaveLength(3);
    expect(data.meta.pageTitle.content).toBe('Grow with PeakUp | PeakUp');
    expect(data.sections[0].title.content).toBe('Get more bookings. Stay independent.');
    expect(data.sections[0].callToAction.href).toBe(INSTRUCTORS_COACH_SIGNUP_PATH);
    expect(data.sections[1].title.content).toBe('Benefits');
    expect(data.sections[1].blocks[0].title.content).toBe('Get more bookings');
    expect(data.sections[2].title.content).toBe('How it works');
    expect(data.sections[2].blocks[1].callToAction.href).toBe(INSTRUCTORS_COACH_SIGNUP_PATH);
  });
});
