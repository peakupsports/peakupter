import React from 'react';
import css from './LandingMobileSearchDebug.module.css';

const yesNo = value => (value ? 'yes' : 'no');

/**
 * Temporary on-screen debug for mobile landing search (remove after iPhone QA).
 *
 * @param {object} props
 * @param {object} props.debugState
 */
const LandingMobileSearchDebug = ({ debugState }) => {
  const {
    ctaClickCount = 0,
    submitFired = false,
    sportSelected = false,
    locationText = '',
    currentLocationSelected = false,
    geocodeStarted = false,
    geocodeResult = '',
    lastError = '',
    ctaDisabled = false,
    isSubmitting = false,
    mapboxGlLoaded = false,
    mapboxSdkLoaded = false,
    accessTokenPresent = false,
    sdkScriptUrl = '',
    sdkFallbackUrl = '',
    sdkOnloadFired = false,
    sdkOnerrorFired = false,
    sdkNetworkStatus = '',
    sdkAttempt = '',
  } = debugState || {};

  return (
    <div className={css.root} aria-live="polite">
      <div className={css.title}>Mobile search debug</div>
      <div>CTA clicked: {ctaClickCount}</div>
      <div>Submit fired: {yesNo(submitFired)}</div>
      <div>Sport selected: {yesNo(sportSelected)}</div>
      <div>Location text: {locationText || '(empty)'}</div>
      <div>Current location selected: {yesNo(currentLocationSelected)}</div>
      <div>Geocode started: {yesNo(geocodeStarted)}</div>
      <div>Geocode result: {geocodeResult || '(none)'}</div>
      <div>mapbox-gl loaded: {yesNo(mapboxGlLoaded)}</div>
      <div>mapbox-sdk loaded: {yesNo(mapboxSdkLoaded)}</div>
      <div>access token present: {yesNo(accessTokenPresent)}</div>
      <div>sdk script URL: {sdkScriptUrl || '(none)'}</div>
      <div>sdk fallback URL: {sdkFallbackUrl || '(none)'}</div>
      <div>sdk attempt: {sdkAttempt || '(none)'}</div>
      <div>sdk onload fired: {yesNo(sdkOnloadFired)}</div>
      <div>sdk onerror fired: {yesNo(sdkOnerrorFired)}</div>
      <div>sdk network status: {sdkNetworkStatus || '(none)'}</div>
      <div>CTA disabled: {yesNo(ctaDisabled)}</div>
      <div>Submitting: {yesNo(isSubmitting)}</div>
      {lastError ? <div className={css.error}>Error: {lastError}</div> : null}
    </div>
  );
};

export default LandingMobileSearchDebug;
