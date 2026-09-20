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
    console.log('PEAKUP SNOW WIDGET START');
  const [snow, setSnow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mountainLiveOpen, setMountainLiveOpen] = useState(false);
  const [selectedWebcamIndex, setSelectedWebcamIndex] = useState(0);
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
        console.error('PEAKUP SNOW ERROR:', e);
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
  const isOffSeason = snow.operatingStatus === 'OFF_SEASON';
  console.log('PEAKUP SNOW WEBCAMS:', snow.webcams);
  return (
    <div className={css.root}>
     <div
  className={css.card}
  onClick={() => setMountainLiveOpen(!mountainLiveOpen)}
>
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
  
          {isOffSeason ? (
  <>
    <span className={css.divider}>|</span>
    <span className={css.status}>
      Closed for season · Reopens Nov 28
    </span>
  </>
) : (
  <>
    <span className={css.divider}>|</span>
    <span className={css.item}>
      <img src={liftIcon} alt="" />
      {snow.liftsOpen != null ? snow.liftsOpen : '—'}/{snow.liftsTotal ?? '—'} lifts
    </span>
  </>
)}
  
          {!isOffSeason ? (
  <>
    <span className={css.divider}>|</span>

    <span className={css.item}>
      <img src={skierIcon} className={css.skierIcon} alt="" />
      {snow.runsOpen != null ? snow.runsOpen : '—'}/{snow.runsTotal ?? '—'} runs
    </span>
  </>
) : null}
  
          <span className={css.divider}>|</span>
  
          <span className={css.item}>
  <img src={snowflakeIcon} alt="" />
  24h: {snow.newSnow24hCm ?? '—'} cm
</span>
        </div>
      </div>
      {mountainLiveOpen ? (
  <div className={css.mountainLive}>
  <div className={css.webcamHeader}>
 <strong>{snow.webcams?.[selectedWebcamIndex]?.name}</strong>

 <span className={css.webcamControls}></span>
 <div className={css.webcamArrows}>
 <button
 className={css.webcamButton}
  type="button"
  onClick={e => {
    e.stopPropagation();
    setSelectedWebcamIndex(
      (selectedWebcamIndex - 1 + snow.webcams.length) % snow.webcams.length
    );
  }}
>
  ‹
</button>
 <button
 className={css.webcamButton}
  type="button"
  onClick={e => {
    e.stopPropagation();
    setSelectedWebcamIndex(
      (selectedWebcamIndex + 1) % snow.webcams.length
    );
  }}
>
  ›
</button>
</div>
</div>
<a
 href={snow.webcams?.[selectedWebcamIndex]?.url}
  target="_blank"
  rel="noopener noreferrer"
  onClick={e => e.stopPropagation()}
>
 <img
  src={snow.webcams?.[selectedWebcamIndex]?.thumbnailUrl}
  alt={snow.webcams?.[selectedWebcamIndex]?.name || 'Mountain webcam'}
  className={css.mountainLiveImage}
/>
<span className={css.liveOverlay}>LIVE ↗</span>
</a>
<div className={css.webcamDots}>
{[0, 1, 2, 3].map(index => (
  <span
    key={index}
    className={
      selectedWebcamIndex % 4 === index
        ? css.webcamDotActive
        : css.webcamDot
    }
  />
))}
</div>
</div>
) : null}
    </div>
  );
};

export default PeakUpSnowWidget;