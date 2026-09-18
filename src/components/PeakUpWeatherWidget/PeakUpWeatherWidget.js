import React, { useEffect, useState } from 'react';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import {
  PEAKUP_WEATHER_GEO_ERROR,
  fetchPeakUpWeather,
  getPeakUpWeatherBrowserCoordinates,
  weatherEmojiFromConditionCode,
} from '../../util/peakupWeather';

import css from './PeakUpWeatherWidget.module.css';

const formatTemp = value => {
  if (value == null || !Number.isFinite(Number(value))) {
    return '—';
  }
  return `${Math.round(Number(value))}°C`;
};

const formatRainLine = (rainChancePercent, precipMm, intl) => {
  if (rainChancePercent != null && Number.isFinite(Number(rainChancePercent))) {
    return intl.formatMessage(
      { id: 'PeakUpWeatherWidget.rainChance' },
      { percent: Math.round(Number(rainChancePercent)) }
    );
  }
  if (precipMm != null && Number.isFinite(Number(precipMm)) && Number(precipMm) > 0) {
    return intl.formatMessage(
      { id: 'PeakUpWeatherWidget.rainAmount' },
      { mm: Number(precipMm).toFixed(1) }
    );
  }
  return intl.formatMessage({ id: 'PeakUpWeatherWidget.rainNone' });
};

/**
 * Compact local weather strip for the customer dashboard (browser location + server proxy).
 */
const PeakUpWeatherWidget = () => {
  const intl = useIntl();
  const [phase, setPhase] = useState('loadingLocation');
  const [weather, setWeather] = useState(null);
  const [geoErrorKey, setGeoErrorKey] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setPhase('loadingLocation');
      setGeoErrorKey(null);
      setWeather(null);

      try {
        const coords = await getPeakUpWeatherBrowserCoordinates();
        if (cancelled) {
          return;
        }

        setPhase('loadingWeather');
        const response = await fetchPeakUpWeather(coords);
        if (cancelled) {
          return;
        }

        if (response?.weather) {
          setWeather(response.weather);
          setPhase('success');
        } else {
          setPhase('weatherError');
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error?.message;
        if (
          message === PEAKUP_WEATHER_GEO_ERROR.DENIED ||
          message === PEAKUP_WEATHER_GEO_ERROR.UNAVAILABLE ||
          message === PEAKUP_WEATHER_GEO_ERROR.INSECURE ||
          message === PEAKUP_WEATHER_GEO_ERROR.INVALID
        ) {
          setGeoErrorKey(message);
          setPhase('geoError');
          return;
        }

        setPhase('weatherError');
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const ariaLabel = intl.formatMessage({ id: 'PeakUpWeatherWidget.ariaLabel' });

  if (phase === 'loadingLocation') {
    return (
      <div className={css.root} aria-label={ariaLabel}>
        <div className={css.card}>
          <p className={css.loading} role="status">
            <FormattedMessage id="PeakUpWeatherWidget.loadingLocation" />
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'loadingWeather') {
    return (
      <div className={css.root} aria-label={ariaLabel}>
        <div className={css.card}>
          <p className={css.loading} role="status">
            <FormattedMessage id="PeakUpWeatherWidget.loadingWeather" />
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'geoError') {
    const messageId =
      geoErrorKey === PEAKUP_WEATHER_GEO_ERROR.DENIED
        ? 'PeakUpWeatherWidget.permissionDenied'
        : geoErrorKey === PEAKUP_WEATHER_GEO_ERROR.INSECURE
          ? 'PeakUpWeatherWidget.insecureContext'
          : 'PeakUpWeatherWidget.unavailable';

    return (
      <div className={css.root} aria-label={ariaLabel}>
        <div className={css.card}>
          <p className={css.message} role="status">
            <FormattedMessage id={messageId} />
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'weatherError' || !weather) {
    return (
      <div className={css.root} aria-label={ariaLabel}>
        <div className={css.card}>
          <p className={css.message} role="status">
            <FormattedMessage id="PeakUpWeatherWidget.apiError" />
          </p>
        </div>
      </div>
    );
  }

  const emoji = weatherEmojiFromConditionCode(weather.conditionCode);
  const rainLine = formatRainLine(weather.rainChancePercent, weather.precipMm, intl);
  const windSpeed =
    weather.windKph != null && Number.isFinite(Number(weather.windKph))
      ? Math.round(Number(weather.windKph))
      : '—';
  const windLine = intl.formatMessage({ id: 'PeakUpWeatherWidget.wind' }, { speed: windSpeed });
  const hasTodayRange =
    weather.todayMinC != null &&
    weather.todayMaxC != null &&
    Number.isFinite(Number(weather.todayMinC)) &&
    Number.isFinite(Number(weather.todayMaxC));

  return (
    <div className={css.root} aria-label={ariaLabel}>
      <div className={css.card}>
        <div className={css.bar}>
          <div className={css.row}>
            <p className={css.segmentLocation}>
              <span aria-hidden="true">📍</span>
              <span>{weather.locationName || '—'}</span>
            </p>
            <span className={css.divider} aria-hidden="true">
              |
            </span>
            <p className={css.segmentPrimary}>
              <span className={css.emoji} aria-hidden="true">
                {emoji}
              </span>
              <span className={css.tempValue}>{formatTemp(weather.tempC)}</span>
              <span className={css.conditionText}>{weather.conditionText || '—'}</span>
            </p>
            <span className={css.divider} aria-hidden="true">
              |
            </span>
            <p className={css.segmentMeta}>
              <FormattedMessage
                id="PeakUpWeatherWidget.feelsLike"
                values={{ temp: formatTemp(weather.feelsLikeC) }}
              />
            </p>
          </div>
          <div className={css.row}>
            <p className={css.segmentMeta}>
              <span className={css.metaIcon} aria-hidden="true">
                💧
              </span>
              <span>{rainLine}</span>
            </p>
            <span className={css.divider} aria-hidden="true">
              |
            </span>
            <p className={css.segmentMeta}>
              <span className={css.metaIcon} aria-hidden="true">
                💨
              </span>
              <span>{windLine}</span>
            </p>
            {hasTodayRange ? (
              <>
                <span className={css.divider} aria-hidden="true">
                  |
                </span>
                <p className={css.segmentMeta}>
                  <FormattedMessage
                    id="PeakUpWeatherWidget.todayRange"
                    values={{
                      min: formatTemp(weather.todayMinC),
                      max: formatTemp(weather.todayMaxC),
                    }}
                  />
                </p>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeakUpWeatherWidget;
