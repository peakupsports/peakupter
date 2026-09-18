const OVERPASS_API_URLS = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter',
  ];
const skiResortCache = new Map();
const SKI_RESORT_CACHE_TTL = 60 * 60 * 1000;
const buildNearbySkiResortsQuery = (lat, lng, radius = 20000) => `
[out:json][timeout:8];

relation(around:${radius},${lat},${lng})
  ["site"="piste"]
  ["type"="site"];

out tags center;
`;
const fetchNearbySkiResorts = async ({ lat, lng, radius = 20000 }) => {
    const query = buildNearbySkiResortsQuery(lat, lng, radius);
    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)},${radius}`;
const cached = skiResortCache.get(cacheKey);

if (cached && Date.now() - cached.timestamp < SKI_RESORT_CACHE_TTL) {
  return cached.data;
}
  
let data;
let lastError;

for (const apiUrl of OVERPASS_API_URLS) {
  try {
    const response = await fetch(
      `${apiUrl}?data=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'PeakUpSports/1.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      throw new Error(`Overpass API responded with ${response.status}`);
    }

    data = await response.json();
    break;
  } catch (error) {
    lastError = error;
  }
}

if (!data) {
  throw lastError || new Error('All Overpass APIs failed');
}

    skiResortCache.set(cacheKey, {
      timestamp: Date.now(),
      data,
    });
    
    return data;
  };
  module.exports = {
    fetchNearbySkiResorts,
  };