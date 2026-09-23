
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 || lat > 90 ||
      lng < -180 || lng > 180 ||
      req.query.lat == null ||
      req.query.lng == null
    ) {
      return res.status(400).json({
        error: 'Invalid coordinates',
      });
    }

    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current: [
        'wave_height',
        'wave_direction',
        'wave_period',
        'swell_wave_height',
        'swell_wave_direction',
        'swell_wave_period',
        'sea_surface_temperature',
      ].join(','),
      timezone: 'auto',
    });

    const response = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?${params}`
    );

    if (!response.ok) {
      throw new Error(`Marine API: ${response.status}`);
    }

    const data = await response.json();

    return res.json(data);
  } catch (error) {
    console.error('PeakUp Surf:', error);
    return res.status(502).json({
      error: 'Surf data unavailable',
    });
  }
});

module.exports = router;