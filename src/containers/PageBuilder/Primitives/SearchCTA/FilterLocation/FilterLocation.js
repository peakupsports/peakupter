import React, { useEffect, useRef, useState } from 'react';
import { Field, useForm } from 'react-final-form';
import { useHistory, useLocation } from 'react-router-dom';
import { useIntl } from '../../../../../util/reactIntl';
import classNames from 'classnames';

import { LocationAutocompleteInput, IconLocation } from '../../../../../components';
import { useRouteConfiguration } from '../../../../../context/routeConfigurationContext';
import {
  coachMapSearchForFreshGeolocationIntent,
  mergeResolvedSportIntoPageSearchForCoachMap,
  resolveCoachMapSportKeyFromLandingForm,
  startCoachMapLandingGeolocationPrimed,
} from '../../../../../util/coachExplore';
import { pathByRouteName } from '../../../../../util/routes';
import {
  LANDING_GEOLOCATION_ERROR,
  MOBILE_LANDING_SEARCH_MAX_WIDTH_PX,
} from '../landingMobileSearchSubmit';
import css from './FilterLocation.module.css';

const identity = v => v;

const isMobileSearchViewport = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(`(max-width: ${MOBILE_LANDING_SEARCH_MAX_WIDTH_PX}px)`).matches;

const CustomIconLocation = () => {
  return <IconLocation rootClassName={css.customIconLocation} />;
};

const LocationSearchField = props => {
  const [isCurrentLocation, setIsCurrentLocation] = useState(false);
  const {
    inputRootClass,
    intl,
    inputRef,
    onLocationChange,
    alignLeft,
    closeOnBlur,
    showPredictionsPanelWhileSearching,
    suppressCurrentLocationWhileSearching,
    deferCurrentLocationGeolocation,
  } = props;
  return (
    <Field
      name="location"
      format={identity}
      render={({ input, meta }) => {
        const { onChange, ...restInput } = input;
        const searchOnChange = value => {
          onChange(value);
          onLocationChange(value);
          const typed = String(value?.search || '').trim();
          if (value?.selectedPlace && value.selectedPlace.address === '') {
            setIsCurrentLocation(true);
          } else if (typed.length > 0) {
            setIsCurrentLocation(false);
          } else {
            setIsCurrentLocation(false);
          }
        };

        return (
          <LocationAutocompleteInput
            id="location-search-filter-location"
            className={css.customField}
            useDarkText={true}
            inputClassName={isCurrentLocation ? css.inputWithCurrentLocation : inputRootClass}
            closeOnBlur={closeOnBlur}
            showPredictionsPanelWhileSearching={showPredictionsPanelWhileSearching}
            suppressCurrentLocationWhileSearching={suppressCurrentLocationWhileSearching}
            deferCurrentLocationGeolocation={deferCurrentLocationGeolocation}
            predictionsClassName={classNames(css.predictions, {
              [css.alignLeft]: alignLeft,
            })}
            CustomIcon={CustomIconLocation}
            iconClassName={css.locationAutocompleteInputIconWrapper}
            isCurrentLocation={isCurrentLocation}
            placeholder={
              isCurrentLocation
                ? intl.formatMessage({
                    id: 'PageBuilder.SearchCTA.currentLocationPlaceholder',
                    defaultMessage: 'Current location',
                  })
                : intl.formatMessage({
                    id: 'PageBuilder.SearchCTA.locationPlaceholder',
                    defaultMessage: 'Location',
                  })
            }
            inputRef={inputRef}
            input={{ ...restInput, onChange: searchOnChange }}
            meta={meta}
          />
        );
      }}
    />
  );
};

const FilterLocation = props => {
  const form = useForm();
  const searchInpuRef = useRef(null);
  const intl = useIntl();
  const history = useHistory();
  const pageLocation = useLocation();
  const routeConfiguration = useRouteConfiguration();
  const {
    setSubmitDisabled,
    className,
    rootClassName,
    alignLeft,
    landingMobileHints = false,
    isMobileLanding = false,
    locationSearchErrorCode = null,
    onClearGeocodeError,
    onMobileLocationContextChange,
    ...restOfProps
  } = props;
  const classes = classNames(rootClassName || css.root, className);
  const [isMobile, setIsMobile] = useState(() => isMobileSearchViewport());

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(`(max-width: ${MOBILE_LANDING_SEARCH_MAX_WIDTH_PX}px)`);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const mobileLandingActive = isMobileLanding || (landingMobileHints && isMobile);

  const onChange = locationValue => {
    onClearGeocodeError?.();

    const typed = String(locationValue?.search || '').trim();
    const hasSelection = !!locationValue?.selectedPlace;
    const isCurrentLocationSelection =
      locationValue?.selectedPlace && locationValue.selectedPlace.address === '';

    if (mobileLandingActive) {
      onMobileLocationContextChange?.({
        isCurrentLocationSelected: isCurrentLocationSelection,
      });
    }

    // Desktop landing: require a list selection before enabling CTA.
    if (!mobileLandingActive) {
      if (typed.length > 0 && !hasSelection) {
        setSubmitDisabled(true);
      } else {
        setSubmitDisabled(false);
      }
    }

    // Desktop only: tapping "Current location" navigates immediately (legacy behavior).
    if (!mobileLandingActive && isCurrentLocationSelection) {
      startCoachMapLandingGeolocationPrimed();
      const path = pathByRouteName('CoachMapPage', routeConfiguration, {});
      const sportKey = resolveCoachMapSportKeyFromLandingForm(
        form.getState().values?.pub_categoryLevel1,
        pageLocation.search
      );
      const merged = mergeResolvedSportIntoPageSearchForCoachMap(pageLocation.search, sportKey);
      const search = coachMapSearchForFreshGeolocationIntent(merged);
      history.push(`${path}${search}`);
    }
  };

  return (
    <div className={classes}>
      <LocationSearchField
        inputRootClass={css.input}
        intl={intl}
        inputRef={searchInpuRef}
        onLocationChange={onChange}
        alignLeft={alignLeft}
        closeOnBlur={!isMobile}
        showPredictionsPanelWhileSearching={mobileLandingActive}
        suppressCurrentLocationWhileSearching={mobileLandingActive}
        deferCurrentLocationGeolocation={mobileLandingActive}
      />
      {locationSearchErrorCode ? (
        <p className={css.selectHint} role="alert">
          {locationSearchErrorCode === LANDING_GEOLOCATION_ERROR.INSECURE
            ? intl.formatMessage({
                id: 'LandingHeroSection.currentLocationHttpsRequired',
                defaultMessage:
                  'Current location is only available on HTTPS. Please type your location.',
              })
            : locationSearchErrorCode === LANDING_GEOLOCATION_ERROR.DENIED
              ? intl.formatMessage({
                  id: 'LandingHeroSection.currentLocationDenied',
                  defaultMessage:
                    'Location permission was denied. Allow location access or type your location.',
                })
              : locationSearchErrorCode === LANDING_GEOLOCATION_ERROR.UNAVAILABLE ||
                  locationSearchErrorCode === LANDING_GEOLOCATION_ERROR.INVALID
                ? intl.formatMessage({
                    id: 'LandingHeroSection.currentLocationUnavailable',
                    defaultMessage:
                      'Current location is unavailable right now. Please type your location.',
                  })
                : intl.formatMessage({
                    id: 'LandingHeroSection.locationSearchError',
                    defaultMessage:
                      'Could not find that location. Try another spelling or use current location.',
                  })}
        </p>
      ) : null}
    </div>
  );
};
export default FilterLocation;
