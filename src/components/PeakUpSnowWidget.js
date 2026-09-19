import React, { useEffect, useState } from 'react';

import { fetchPeakUpSnow } from '../util/peakupSnow';
import { getPeakUpWeatherBrowserCoordinates } from '../util/peakupWeather';
import css from './PeakUpSnowWidget.module.css';
import snowflakeIcon from '../assets/WeatherIcons/weather-snowflake.png';
import liftIcon from '../assets/WeatherIcons/weather-lift.png';
import skierIcon from '../assets/WeatherIcons/weather-skier.png';
/**
 * Compact SnowSure snow report.
 * Temporary V1 uses Laax to verify the complete frontend integration.
 */
const PeakUpSnowWidget = () => {
  const [snow, setSnow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const coords = await getPeakUpWeatherBrowserCoordinates();
const response = await fetchPeakUpSnow(coords);

        if (cancelled) {
          return;
        }

        if (response?.snow) {
          setSnow(response.snow);
        } else {
          setError(true);
        }
      } catch (e) {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return null;
  }
  
  if (error || !snow) {
    return null;
  }
  
  return (
    <div className={css.root}>
      <div className={css.card}>
        <div className={css.bar}>
        <span className={css.resort}>
  <img src={snowflakeIcon} alt="" />
  {snow.name}
</span>
  
          <span className={css.divider}>|</span>
  
          <span className={css.temperature}>
            {snow.temperatureC != null ? `${snow.temperatureC}°C` : '—'}
          </span>
  
          <span className={css.status}>{snow.conditions || '—'}</span>
  
          <span className={css.divider}>|</span>
  
          <span className={css.item}>
  <img src={liftIcon} alt="" />
  {snow.liftsOpen != null ? snow.liftsOpen : '—'}/{snow.liftsTotal ?? '—'} lifts
</span>
  
          <span className={css.divider}>|</span>
  
          <span className={css.item}>
          <img src={skierIcon} className={css.skierIcon} alt="" />
  {snow.runsOpen != null ? snow.runsOpen : '—'}/{snow.runsTotal ?? '—'} runs
</span>
  
          <span className={css.divider}>|</span>
  
          <span className={css.item}>
  <img src={snowflakeIcon} alt="" />
  24h: {snow.newSnow24hCm ?? '—'} cm
</span>
        </div>
      </div>
    </div>
  );
};

export default PeakUpSnowWidget;