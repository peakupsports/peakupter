const SNOWSURE_API_BASE_URL = 'https://www.snowsure.ai/api/v1';

/**
 * Convert SnowSure's large resort payload into the small,
 * stable shape PeakUp needs.
 *
 * @param {object} payload Raw SnowSure response
 * @returns {object}
 */
const normalizeSnowSureResort = payload => {
  const data = payload?.data || payload;

  return {
    name: data?.name || '',
    slug: data?.slug || '',
    country: data?.country || '',

    isOpen: data?.isOpen ?? null,
    status: data?.statusLabel || data?.status || '',
    openingDate: data?.seasonOpeningDate || null,

    liftsTotal: data?.operations?.liftsTotal ?? null,
    liftsOpen: data?.operations?.liftsOpen ?? null,
    
    runsTotal: data?.operations?.runsTotal ?? null,
    runsOpen: data?.operations?.runsOpen ?? null,
    
    liftPctOpen: data?.operations?.liftPctOpen ?? null,
    terrainPercentOpen: data?.operations?.terrainPercentOpen ?? null,

    temperatureC: data?.currentConditions?.temperature ?? null,
    conditions: data?.currentConditions?.conditions || '',

    snowDepthBaseCm:
      data?.snow?.depthCm?.base ??
      data?.snow?.baseDepthCm ??
      null,

    snowDepthMidCm:
      data?.snow?.depthCm?.mid ??
      data?.snow?.midDepthCm ??
      null,

    snowDepthSummitCm:
      data?.snow?.depthCm?.summit ??
      data?.snow?.summitDepthCm ??
      null,

    newSnow24hCm:
      data?.snow?.last24hCm ??
      null,

    newSnow48hCm:
      data?.snow?.last48hCm ??
      null,

    newSnow7dCm:
      data?.snow?.last7dCm ??
      null,

    forecast14DaysCm:
      data?.forecast?.total14dCm ??
      null,

    forecast: data?.forecast?.windows || data?.forecast?.daily || [],

    heroImage: data?.heroImage || null,
    gallery: data?.gallery || [],
  };
};

/**
 * Fetch all SnowSure resorts.
 *
 * @returns {Promise<object>}
 */
const fetchSnowSureResorts = async () => {
  const response = await fetch(`${SNOWSURE_API_BASE_URL}/resorts`);

  if (!response.ok) {
    const err = new Error(
      `SnowSure provider responded with ${response.status}`
    );
    err.status = response.status;
    throw err;
  }

  return response.json();
};

/**
 * Fetch and normalize one SnowSure resort.
 *
 * @param {string} slug SnowSure resort slug
 * @returns {Promise<object>}
 */
const fetchSnowSureResort = async slug => {
  if (!slug || typeof slug !== 'string') {
    const err = new Error('A valid SnowSure resort slug is required');
    err.status = 400;
    throw err;
  }

  const response = await fetch(
    `${SNOWSURE_API_BASE_URL}/resorts/${encodeURIComponent(slug)}`,
    {
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!response.ok) {
    const err = new Error(
      `SnowSure provider responded with ${response.status}`
    );
    err.status = response.status;
    throw err;
  }

  const data = await response.json();

  return normalizeSnowSureResort(data);
};

module.exports = {
  normalizeSnowSureResort,
  fetchSnowSureResorts,
  fetchSnowSureResort,
};