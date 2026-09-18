const { getSdk } = require('../api-util/sdk');
const {
    fetchNearbySkiResorts,
  } = require('../api-util/peakupSkiResortService');
const {
  fetchSnowSureResorts,
  fetchSnowSureResort,
} = require('../api-util/peakupSnowService');

/**
 * GET /api/peakup/snow
 * GET /api/peakup/snow?slug=laax
 *
 * Authenticated proxy to SnowSure.
 */
module.exports = async (req, res) => {
  try {
    const sdk = getSdk(req, res);

    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse?.data?.data;

    if (!currentUser?.id) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    const lat = Number(req.query?.lat);
    const lng = Number(req.query?.lng);
    
    let snow;
    
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const osmResponse = await fetchNearbySkiResorts({ lat, lng });
        console.log(
            '[peakup-snow] OSM resort names:',
            osmResponse?.elements?.map(r => r.tags?.name).filter(Boolean)
          );
console.log('[peakup-snow] USER GPS:', { lat, lng });
console.log(
    '[peakup-snow] OSM centers:',
    osmResponse?.elements?.map(r => ({
      name: r.tags?.name,
      lat: r.center?.lat,
      lng: r.center?.lon,
    }))
  );
  const osmResorts = osmResponse?.elements || [];

const nearestOsm = osmResorts.reduce((best, resort) => {
  const resortLat = Number(resort?.center?.lat);
  const resortLng = Number(resort?.center?.lon);

  if (!Number.isFinite(resortLat) || !Number.isFinite(resortLng)) {
    return best;
  }

  const distance =
    Math.sqrt((resortLat - lat) ** 2 + (resortLng - lng) ** 2);

  if (!best || distance < best.distance) {
    return {
      name: resort.tags?.name,
      distance,
    };
  }

  return best;
}, null);

console.log('[peakup-snow] NEAREST OSM:', nearestOsm);
console.log('[peakup-snow] OSM NAME FOR SNOWSURE:', nearestOsm?.name);
if (nearestOsm?.name) {
    const osmSlug = nearestOsm.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  
    console.log('[peakup-snow] OSM SNOWSURE SLUG:', osmSlug);
    snow = await fetchSnowSureResort(osmSlug);
    
}
if (snow) {
    res.status(200).json({
      ok: true,
      snow,
    });
    return;
  }
      const resortsResponse = await fetchSnowSureResorts();
      const resorts = resortsResponse?.data || [];
    
      if (!Array.isArray(resorts) || resorts.length === 0) {
        const err = new Error('No SnowSure resorts available.');
        err.status = 404;
        throw err;
      }
    
      const toRadians = value => (value * Math.PI) / 180;
    
      const distanceKm = resort => {
        const resortLat = Number(resort?.coordinates?.lat);
        const resortLng = Number(resort?.coordinates?.lng);
    
        if (!Number.isFinite(resortLat) || !Number.isFinite(resortLng)) {
          return Infinity;
        }
    
        const earthRadiusKm = 6371;
        const dLat = toRadians(resortLat - lat);
        const dLng = toRadians(resortLng - lng);
    
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRadians(lat)) *
            Math.cos(toRadians(resortLat)) *
            Math.sin(dLng / 2) ** 2;
    
        return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };
    
      const nearest = resorts.reduce((best, resort) =>
        distanceKm(resort) < distanceKm(best) ? resort : best
      );
    
      snow = await fetchSnowSureResort(nearest.slug);
    } else {
      const slug = req.query?.slug;
    
      snow = slug
        ? await fetchSnowSureResort(slug)
        : await fetchSnowSureResorts();
    }

    res.status(200).json({
      ok: true,
      snow,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[peakup-snow] fetch failed:', error);

    const status =
      error.status >= 400 && error.status < 600 ? error.status : 502;

    res.status(status).json({
      message: error.message || 'Failed to load snow data.',
    });
  }
};