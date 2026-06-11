import { adminFetch } from './coachApplicationAdmin';

export const PARTNER_PRIORITY_LEVELS = ['standard', 'partner', 'sponsor', 'strategic'];

export const TIER_FILTER_IDS = ['founder', 'ambassador', 'top_coach', 'certified_coach'];

export const PARTNER_PRIORITY_LEVEL_LABEL_IDS = {
  standard: 'PeakUpHqCoachManagement.partnerLevel.standard',
  partner: 'PeakUpHqCoachManagement.partnerLevel.partner',
  sponsor: 'PeakUpHqCoachManagement.partnerLevel.sponsor',
  strategic: 'PeakUpHqCoachManagement.partnerLevel.strategic',
};

/** @deprecated Use {@link getTierBadgeLabel} from `coachTier.js` (English-only labels). */
export const TIER_FILTER_LABEL_IDS = {
  founder: 'PeakUpCoachFigurineCard.badge.founder',
  ambassador: 'PeakUpCoachFigurineCard.badge.ambassador',
  top_coach: 'PeakUpCoachFigurineCard.badge.topCoach',
  certified_coach: 'PeakUpCoachFigurineCard.badge.certifiedCoach',
};

/**
 * @param {{ q?: string, sport?: string, country?: string, tier?: string, partnerOnly?: boolean }} [params]
 */
export const fetchCoachManagementAdminList = (params = {}) => {
  const search = new URLSearchParams();
  if (params.q) {
    search.set('q', params.q);
  }
  if (params.sport) {
    search.set('sport', params.sport);
  }
  if (params.country) {
    search.set('country', params.country);
  }
  if (params.tier) {
    search.set('tier', params.tier);
  }
  if (params.partnerOnly) {
    search.set('partnerOnly', '1');
  }
  const qs = search.toString();
  return adminFetch(`/api/coach-management-admin${qs ? `?${qs}` : ''}`);
};

export const assignPartnerPriorityAdmin = ({ coachId, level, reason, until }) =>
  adminFetch('/api/coach-management-admin/partner-priority', {
    method: 'POST',
    body: JSON.stringify({ coachId, level, reason, until: until || null }),
  });

export const clearPartnerPriorityAdmin = ({ coachId }) =>
  adminFetch('/api/coach-management-admin/partner-priority/clear', {
    method: 'POST',
    body: JSON.stringify({ coachId }),
  });

export const approveLegacyCoachAdmin = ({ userId }) =>
  adminFetch('/api/coach-legacy-approve', {
    method: 'POST',
    body: JSON.stringify({ userId, dryRun: false }),
  });
