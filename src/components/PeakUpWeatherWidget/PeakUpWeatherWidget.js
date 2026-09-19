import React, { useEffect, useState } from 'react';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import {
  PEAKUP_WEATHER_GEO_ERROR,
  fetchPeakUpWeather,
  getPeakUpWeatherBrowserCoordinates,
  weatherEmojiFromConditionCode,
} from '../../util/peakupWeather';

import css from './PeakUpWeatherWidget.module.css';
import sunnyIcon from '../../assets/WeatherIcons/weather-sunny.png';
import partlyCloudyIcon from '../../assets/WeatherIcons/weather-partly-cloudy.png';
import cloudyIcon from '../../assets/WeatherIcons/weather-cloudy.png';
import rainIcon from '../../assets/WeatherIcons/weather-rain.png';
import heavyRainIcon from '../../assets/WeatherIcons/weather-heavy-rain.png';
import snowIcon from '../../assets/WeatherIcons/weather-snow.png';
import thunderstormIcon from '../../assets/WeatherIcons/weather-thunderstorm.png';
import fogIcon from '../../assets/WeatherIcons/weather-fog.png';
import temperatureIcon from '../../assets/WeatherIcons/weather-temperature.png';
import surfWindIcon from '../../assets/WeatherIcons/surf-wind.png';
import locationIcon from '../../assets/WeatherIcons/location-pin.png';
import rainChanceIcon from '../../assets/WeatherIcons/weather-rain-chance.png';
const weatherIconFromConditionCode = code => {
  const n = Number(code);

  if (!Number.isFinite(n)) return temperatureIcon;
  if (n === 1000) return sunnyIcon;
  if (n === 1003) return partlyCloudyIcon;
  if (n === 1006 || n === 1009) return cloudyIcon;
  if (n === 1030 || n === 1135 || n === 1147) return fogIcon;

  if (
    n === 1066 || n === 1114 ||
    n === 1210 || n === 1213 || n === 1216 ||
    n === 1219 || n === 1222 || n === 1225 ||
    n === 1255 || n === 1258
  ) return snowIcon;

  if (
    n === 1087 || n === 1273 || n === 1276 ||
    n === 1279 || n === 1282
  ) return thunderstormIcon;

  if (
    n === 1192 || n === 1195 ||
    n === 1243 || n === 1246
  ) return heavyRainIcon;

  if (
    n === 1063 || n === 1150 || n === 1153 ||
    n === 1180 || n === 1183 || n === 1186 || n === 1189 ||
    n === 1240 ||
    n === 1072 || n === 1168 || n === 1171 ||
    n === 1198 || n === 1201 || n === 1204 ||
    n === 1207 || n === 1249 || n === 1252
  ) return rainIcon;

  return partlyCloudyIcon;
};
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
const PeakUpWeatherWidget = ({ onWeatherEmoji }) => {
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
  useEffect(() => {
    if (onWeatherEmoji) {
      onWeatherEmoji(weatherIconFromConditionCode(weather?.conditionCode));
    }
  }, [weather?.conditionCode, onWeatherEmoji]);
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
  const weatherIcon = weatherIconFromConditionCode(weather.conditionCode);
 
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
            <span className={css.locationIcon} aria-hidden="true">
  <img src={locationIcon} alt="" />
</span>
              <span>{weather.locationName || '—'}</span>
            </p>
            <span className={css.divider} aria-hidden="true">
              |
            </span>
            <p className={css.segmentPrimary}>
              <span className={css.emoji} aria-hidden="true">
              <img src={weatherIcon} alt="" />
              </span>
              <span className={css.tempValue}>
  <img src={temperatureIcon} alt="" />
  {formatTemp(weather.tempC)}
</span>
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
  <img src={rainChanceIcon} alt="" />
</span>
              <span>{rainLine}</span>
            </p>
            <span className={css.divider} aria-hidden="true">
              |
            </span>
            <p className={css.segmentMeta}>
            <span className={css.metaIcon} aria-hidden="true">
  <img src={surfWindIcon} alt="" />
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
