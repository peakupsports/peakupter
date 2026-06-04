import {
  buildCoachBookingServiceCards,
  formatCoachBookingServiceCampDetail,
  formatCoachBookingServicePriceDisplay,
  groupCoachBookingServiceCards,
  resolveCoachBookingServiceBadgeIds,
  resolveCoachBookingServiceTrustBadgeLabels,
  SERVICE_GROUP_CAMPS_EVENTS,
  SERVICE_GROUP_LESSONS,
} from './coachBookingServiceSelection';

const intl = {
  formatMessage: ({ id, defaultMessage }, values) => {
    if (values?.count != null) {
      return `${values.count} days`;
    }
    return defaultMessage || id;
  },
  formatNumber: (value, opts) => {
    if (opts?.style === 'currency') {
      const symbol = opts.currency === 'EUR' ? '€' : 'CHF';
      return `${symbol}${value}`;
    }
    return String(value);
  },
  formatDate: (date, opts) => {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (opts?.month === 'short' && opts?.day === 'numeric') {
      return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
    }
    if (opts?.day === 'numeric') {
      return String(d.getUTCDate());
    }
    return d.toISOString();
  },
};

describe('coachBookingServiceSelection', () => {
  const hourlyListing = {
    id: { uuid: 'hourly-1' },
    attributes: {
      title: 'Private ski lesson',
      description: 'One-on-one coaching for kids and adults.',
      state: 'published',
      price: { amount: 8000, currency: 'EUR' },
      publicData: {
        unitType: 'hour',
        sports: ['ski'],
        transactionProcessAlias: 'default-booking/release-1',
      },
    },
  };

  const purchaseListing = {
    id: { uuid: 'camp-1' },
    attributes: {
      title: 'Summer camp',
      state: 'published',
      price: { amount: 55000, currency: 'CHF' },
      publicData: {
        unitType: 'item',
        listingType: 'multi_day_experience',
        transactionProcessAlias: 'default-purchase/release-1',
        experienceStartDate: '2030-07-06T00:00:00.000Z',
        experienceEndDate: '2030-07-10T00:00:00.000Z',
      },
    },
  };

  it('formatCoachBookingServicePriceDisplay uses / hour without decimals for whole amounts', () => {
    const display = formatCoachBookingServicePriceDisplay(hourlyListing, intl, 'CHF');
    expect(display).toEqual({
      prefix: 'From',
      amount: '€80',
      suffix: '/ hour',
    });
  });

  it('formatCoachBookingServiceCampDetail shows a compact date range', () => {
    expect(formatCoachBookingServiceCampDetail(purchaseListing, intl)).toBe('Jul 6 – 10');
  });

  it('resolveCoachBookingServiceBadgeIds returns at most two badges', () => {
    const badges = resolveCoachBookingServiceBadgeIds(hourlyListing, { isBestPrice: true });
    expect(badges.length).toBeLessThanOrEqual(2);
    expect(badges).toEqual(['bestPrice', 'privateLesson']);
  });

  it('groupCoachBookingServiceCards splits lessons and camps when both exist', () => {
    const cards = buildCoachBookingServiceCards({
      listings: [hourlyListing, purchaseListing],
      intl,
      marketplaceCurrency: 'CHF',
    });
    const { showGrouping, sections } = groupCoachBookingServiceCards(cards);
    expect(showGrouping).toBe(true);
    expect(sections).toHaveLength(2);
    expect(sections[0].id).toBe(SERVICE_GROUP_LESSONS);
    expect(sections[1].id).toBe(SERVICE_GROUP_CAMPS_EVENTS);
    expect(sections[1].cards[0].campDetail).toBe('Jul 6 – 10');
  });

  it('resolveCoachBookingServiceTrustBadgeLabels returns at most two tier labels', () => {
    const labels = resolveCoachBookingServiceTrustBadgeLabels(intl, {
      peakupCoachBadges: ['ambassador', 'certified_coach'],
    });
    expect(labels.length).toBe(2);
    expect(labels[0]).toBe('Ambassador');
    expect(labels[1]).toBe('Certified Coach');
  });

  it('groupCoachBookingServiceCards hides labels for a single group', () => {
    const cards = buildCoachBookingServiceCards({
      listings: [hourlyListing],
      intl,
      marketplaceCurrency: 'CHF',
    });
    const { showGrouping, sections } = groupCoachBookingServiceCards(cards);
    expect(showGrouping).toBe(false);
    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe(SERVICE_GROUP_LESSONS);
  });
});
