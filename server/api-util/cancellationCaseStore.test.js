const {
  CASE_STATUSES,
  isActiveCaseStatus,
  normalizeCaseRecord,
  applyStatusTransitionFields,
} = require('./cancellationCaseStore');

// applyStatusTransitionFields is not exported - test via normalize + patch logic indirectly
// Export isActiveCaseStatus and normalizeCaseRecord only from module - I need to test isActiveCaseStatus

describe('cancellationCaseStore helpers', () => {
  it('treats resolved, closed, dismissed, and cancelled as inactive', () => {
    expect(isActiveCaseStatus(CASE_STATUSES.OPEN)).toBe(true);
    expect(isActiveCaseStatus(CASE_STATUSES.IN_PROGRESS)).toBe(true);
    expect(isActiveCaseStatus(CASE_STATUSES.REFUND_PENDING)).toBe(true);
    expect(isActiveCaseStatus(CASE_STATUSES.RESOLVED)).toBe(false);
    expect(isActiveCaseStatus(CASE_STATUSES.CLOSED)).toBe(false);
    expect(isActiveCaseStatus(CASE_STATUSES.DISMISSED)).toBe(false);
    expect(isActiveCaseStatus(CASE_STATUSES.CANCELLED)).toBe(false);
  });

  it('normalizes legacy records with safe defaults', () => {
    const normalized = normalizeCaseRecord({
      id: 'legacy-1',
      status: 'open',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(normalized.adminNotes).toBe('');
    expect(normalized.resolvedAt).toBeNull();
    expect(normalized.dismissedAt).toBeNull();
    expect(normalized.reopenedAt).toBeNull();
    expect(normalized.refundStatus).toBe('pending_review');
  });
});
