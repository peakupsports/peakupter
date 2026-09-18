import React, { useEffect, useState } from 'react';

import { fetchPeakUpSnow } from '../util/peakupSnow';
import { getPeakUpWeatherBrowserCoordinates } from '../util/peakupWeather';
import css from './PeakUpSnowWidget.module.css';
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
          <span className={css.resort}>❄️ {snow.name}</span>
  
          <span className={css.divider}>|</span>
  
          <span className={css.temperature}>
            {snow.temperatureC != null ? `${snow.temperatureC}°C` : '—'}
          </span>
  
          <span className={css.status}>{snow.conditions || '—'}</span>
  
          <span className={css.divider}>|</span>
  
          <span className={css.item}>
            🚡 {snow.liftsOpen != null ? snow.liftsOpen : '—'}/{snow.liftsTotal ?? '—'} lifts
          </span>
  
          <span className={css.divider}>|</span>
  
          <span className={css.item}>
            ⛷️ {snow.runsOpen != null ? snow.runsOpen : '—'}/{snow.runsTotal ?? '—'} runs
          </span>
  
          <span className={css.divider}>|</span>
  
          <span className={css.item}>
            ❄️ 24h: {snow.newSnow24hCm ?? '—'} cm
          </span>
        </div>
      </div>
    </div>
  );
};

export default PeakUpSnowWidget;