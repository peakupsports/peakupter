import {
  buildCoachCalendarFromListingWizardSearch,
  createMinimalAvailabilityPlanPayload,
  hasValidSharetribeAvailabilityPlan,
  isCoachCalendarConnectedFromSearch,
  parseListingWizardReturnFromSearch,
  resolveCoachCalendarListingWizardState,
} from './coachCalendarListingBridge';

describe('coachCalendarListingBridge', () => {
  it('builds return search params for listing wizard (listingId + legacy keys)', () => {
    const search = buildCoachCalendarFromListingWizardSearch({
      slug: 'my-listing',
      id: 'uuid-1',
      type: 'draft',
      tab: 'availability',
    });
    expect(search).toContain('fromListingWizard=1');
    expect(search).toContain('listingSlug=my-listing');
    expect(search).toContain('listingId=uuid-1');
    expect(search).toContain('listingType=draft');
    expect(search).toContain('returnTab=availability');
    expect(search).toContain('returnId=uuid-1');
  });

  it('parses listing wizard return from listingId query params', () => {
    const ctx = parseListingWizardReturnFromSearch({
      fromListingWizard: '1',
      listingSlug: 'slug',
      listingId: 'id',
      listingType: 'edit',
      returnTab: 'availability',
    });
    expect(ctx).toEqual({
      slug: 'slug',
      id: 'id',
      type: 'edit',
      tab: 'availability',
      useFullDays: false,
    });
  });

  it('parses listing wizard return from legacy returnId query params', () => {
    const ctx = parseListingWizardReturnFromSearch({
      fromListingWizard: '1',
      returnSlug: 'slug',
      returnId: 'id',
      returnType: 'edit',
      returnTab: 'availability',
    });
    expect(ctx?.id).toBe('id');
  });

  it('detects valid availability plan by entries', () => {
    expect(hasValidSharetribeAvailabilityPlan(null)).toBe(false);
    expect(hasValidSharetribeAvailabilityPlan({ timezone: 'Etc/UTC', entries: [] })).toBe(false);
    expect(
      hasValidSharetribeAvailabilityPlan({
        timezone: 'Etc/UTC',
        entries: [{ dayOfWeek: 'mon', startTime: '09:00', endTime: '17:00', seats: 1 }],
      })
    ).toBe(true);
  });

  it('creates hourly minimal plan with seven entries', () => {
    const payload = createMinimalAvailabilityPlanPayload({
      timezone: 'Europe/Zurich',
      useFullDays: false,
    });
    expect(payload.availabilityPlan.entries).toHaveLength(7);
    expect(payload.availabilityPlan.entries[0]).toMatchObject({
      dayOfWeek: 'mon',
      startTime: '00:00',
      endTime: '00:00',
      seats: 1,
    });
  });

  it('detects coach calendar connected flag', () => {
    expect(isCoachCalendarConnectedFromSearch({ coachCalendarConnected: '1' })).toBe(true);
    expect(isCoachCalendarConnectedFromSearch({})).toBe(false);
  });

  it('enables listing wizard mode when fromListingWizard=1 is in URL', () => {
    const wizardSearch = {
      fromListingWizard: '1',
      listingSlug: 'slug',
      listingId: 'id',
      listingType: 'edit',
      returnTab: 'availability',
    };

    const state = resolveCoachCalendarListingWizardState(wizardSearch);
    expect(state.isListingWizardMode).toBe(true);
    expect(state.listingWizardReturn).toEqual(parseListingWizardReturnFromSearch(wizardSearch));
    expect(state.modeSource).toBe('url');
  });

  it('enables listing wizard mode with listingId only (no fromListingWizard flag)', () => {
    const state = resolveCoachCalendarListingWizardState({
      listingId: 'uuid-only',
      listingType: 'draft',
      returnTab: 'availability',
    });
    expect(state.isListingWizardMode).toBe(true);
    expect(state.listingWizardReturn?.id).toBe('uuid-only');
  });

  it('uses returnId as listing id when listingId is absent', () => {
    const state = resolveCoachCalendarListingWizardState({
      fromListingWizard: '1',
      returnId: 'legacy-id',
      returnType: 'draft',
    });
    expect(state.isListingWizardMode).toBe(true);
    expect(state.listingWizardReturn?.id).toBe('legacy-id');
  });

  it('disables listing wizard mode without listing params', () => {
    expect(resolveCoachCalendarListingWizardState({})).toMatchObject({
      isListingWizardMode: false,
      listingWizardReturn: null,
      modeSource: 'none',
    });
  });
});
