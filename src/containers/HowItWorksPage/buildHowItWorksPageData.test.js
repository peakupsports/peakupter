import { createIntl, createIntlCache } from '../../util/reactIntl';
import messages from '../../translations/en.json';

import { buildHowItWorksPageData } from './buildHowItWorksPageData';
import { HOW_IT_WORKS_GROW_PATH } from './howItWorksContent';

const intl = createIntl({ locale: 'en', messages }, createIntlCache());

describe('buildHowItWorksPageData', () => {
  it('builds four localized sections with corrected coach copy', () => {
    const data = buildHowItWorksPageData(intl, { marketplaceName: 'PeakUp' });

    expect(data.sections).toHaveLength(4);
    expect(data.meta.pageTitle.content).toBe('How It Works | PeakUp');
    expect(data.sections[0].title.content).toBe('How PeakUp Sports Works');
    expect(data.sections[1].title.content).toBe('For Clients');
    expect(data.sections[2].title.content).toBe('For Coaches');
    expect(data.sections[2].blocks[2].title.content).toBe('Manage your schedule');
    expect(data.sections[3].blocks[1].callToAction.href).toBe(HOW_IT_WORKS_GROW_PATH);
  });
});
