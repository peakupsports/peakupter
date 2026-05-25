/** Bronze tier thresholds — aligned with Ambassador Program popup copy. */
const BRONZE_CRITERIA = {
  reviews: { min: 10, type: 'min' },
  sessions: { min: 20, type: 'min' },
  referrals: { min: 5, type: 'min' },
  response: { maxHours: 24, type: 'maxHours' },
  cancellations: { max: 0, type: 'max' },
  profile: { minPercent: 100, type: 'percent' },
};

const clampPercent = value => Math.min(100, Math.max(0, Math.round(value)));

const evaluateCriterion = (id, metrics) => {
  const cfg = BRONZE_CRITERIA[id];
  if (!cfg) {
    return { id, progress: 0, completed: false, current: 0, target: 0 };
  }

  switch (id) {
    case 'reviews': {
      const current = metrics.reviews || 0;
      const target = cfg.min;
      return {
        id,
        current,
        target,
        progress: clampPercent((current / target) * 100),
        completed: current >= target,
      };
    }
    case 'sessions': {
      const current = metrics.completedSessions || 0;
      const target = cfg.min;
      return {
        id,
        current,
        target,
        progress: clampPercent((current / target) * 100),
        completed: current >= target,
      };
    }
    case 'referrals': {
      const current = metrics.activeReferrals || metrics.verifiedReferrals || 0;
      const target = cfg.min;
      return {
        id,
        current,
        target,
        progress: clampPercent((current / target) * 100),
        completed: current >= target,
      };
    }
    case 'response': {
      const hours = metrics.avgResponseHours;
      const withinTarget = hours == null ? false : hours <= cfg.maxHours;
      const progress =
        hours == null ? 0 : hours <= cfg.maxHours ? 100 : clampPercent((cfg.maxHours / hours) * 100);
      return {
        id,
        current: hours,
        target: cfg.maxHours,
        progress,
        completed: withinTarget,
      };
    }
    case 'cancellations': {
      const current = metrics.coachCancellations || 0;
      const target = cfg.max;
      return {
        id,
        current,
        target,
        progress: current <= target ? 100 : 0,
        completed: current <= target,
      };
    }
    case 'profile': {
      const current = metrics.profileCompleteness || 0;
      const target = cfg.minPercent;
      return {
        id,
        current,
        target,
        progress: clampPercent(current),
        completed: current >= target,
      };
    }
    default:
      return { id, progress: 0, completed: false, current: 0, target: 0 };
  }
};

const evaluateBronzeProgress = metrics => {
  const criteriaIds = ['reviews', 'sessions', 'referrals', 'response', 'cancellations', 'profile'];
  const criteria = criteriaIds.map(id => evaluateCriterion(id, metrics));
  const allComplete = criteria.every(item => item.completed);

  return {
    criteria,
    allComplete,
    completedCount: criteria.filter(item => item.completed).length,
    totalCount: criteria.length,
  };
};

module.exports = {
  BRONZE_CRITERIA,
  evaluateBronzeProgress,
};
