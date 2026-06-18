import { createIntl, createIntlCache } from '../../util/reactIntl';
import enMessages from '../../translations/en.json';

import { buildSportLandingPageData } from './buildSportLandingPageData';

const cache = createIntlCache();
const intl = createIntl({ locale: 'en', messages: enMessages }, cache);

describe('buildSportLandingPageData', () => {
  it('builds canyoning landing page sections from locale messages', () => {
    const data = buildSportLandingPageData(intl, { sportKey: 'canyoning', marketplaceName: 'PeakUp' });

    expect(data.meta.pageTitle.content).toContain('Canyoning');
    expect(data.sections).toHaveLength(2);
    expect(data.sections[0].sectionType).toBe('hero');
    expect(data.sections[0].title.content).toBe('Find certified canyoning guides');
    expect(data.sections[0].description.content).toContain('canyoning guides');
    expect(data.sections[1].callToAction.href).toBe('/coaches?sport=canyoning');
  });
});
