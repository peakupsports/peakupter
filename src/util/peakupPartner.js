const truthy = value => value === true || value === 'true' || value === 1 || value === '1';

/**
 * @param {import('./types').propTypes.currentUser|null|undefined} user
 */
export const hasPartnerDashboardAccess = user => {
  const pd = user?.attributes?.profile?.publicData || {};
  return (
    truthy(pd.partnerPriority) ||
    Boolean(String(pd.partnerPriorityLevel || '').trim()) ||
    Boolean(String(pd.partnerPriorityUntil || '').trim())
  );
};

/**
 * @param {import('./types').propTypes.currentUser|null|undefined} user
 */
export const readPartnerDashboardMeta = user => {
  const pd = user?.attributes?.profile?.publicData || {};
  const level = String(pd.partnerPriorityLevel || 'partner').trim() || 'partner';
  const active = truthy(pd.partnerPriority);

  return {
    statusLabel: active ? 'Active partner' : 'Partner profile',
    levelLabel: level.charAt(0).toUpperCase() + level.slice(1),
    visibilityLabel: active ? 'Priority placement enabled' : 'Standard visibility',
  };
};

export const PARTNER_DASHBOARD_PATH = '/partner-dashboard';
