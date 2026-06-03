import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { Form as FinalForm } from 'react-final-form';
import { useHistory, useLocation } from 'react-router-dom';

// Contexts
import { useRouteConfiguration } from '../../../../context/routeConfigurationContext';
import { useConfiguration } from '../../../../context/configurationContext';

// Utility
import { getPeakUpTopLevelSportOptions } from '../../../../util/peakupSportTaxonomy';
import {
  buildCoachMapSearchWithManualLocation,
  coachMapSearchForFreshGeolocationIntent,
  debugCoachMapLocate,
  isLocationFieldCurrentLocation,
  mergeResolvedSportIntoPageSearchForCoachMap,
  normalizeGeocoderOriginLatLng,
  resolveCoachMapSportKeyFromLandingForm,
  startCoachMapLandingGeolocationPrimed,
} from '../../../../util/coachExplore';
import { pathByRouteName } from '../../../../util/routes';

// Shared components
import { Form, PrimaryButton } from '../../../../components';

import FilterCategories from './FilterCategories/FilterCategories';
import FilterDateRange from './FilterDateRange/FilterDateRange';
import FilterLocation from './FilterLocation/FilterLocation';
import FilterKeyword from './FilterKeyword/FilterKeyword';
import {
  isMobileLandingCTAReady,
  isMobileLandingSearchViewport,
  MOBILE_LANDING_SEARCH_MAX_WIDTH_PX,
  submitMobileLandingSearch,
} from './landingMobileSearchSubmit';

import css from './SearchCTA.module.css';

const PEAKUP_SEARCH_BUTTON_LABEL = 'Find your coach';

const GRID_CONFIG = [
  { gridCss: css.gridCol1 },
  { gridCss: css.gridCol2 },
  { gridCss: css.gridCol3 },
  { gridCss: css.gridCol4 },
];

const getGridCount = numberOfFields => {
  const gridConfig = GRID_CONFIG[numberOfFields - 1];
  return gridConfig ? gridConfig.gridCss : GRID_CONFIG[0].gridCss;
};

export const SearchCTA = React.forwardRef((props, ref) => {
  const history = useHistory();
  const location = useLocation();
  const routeConfiguration = useRouteConfiguration();
  const config = useConfiguration();

  const { categories, dateRange, keywordSearch, locationSearch } = props.searchFields;
  const landingMobileHints = props.landingMobileHints === true;

  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [locationSearchErrorCode, setLocationSearchErrorCode] = useState(null);
  const [isMobileSubmitting, setIsMobileSubmitting] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    landingMobileHints ? isMobileLandingSearchViewport() : false
  );
  const [mobileLocationContext, setMobileLocationContext] = useState({
    isCurrentLocationSelected: false,
  });

  const isMobileLanding = landingMobileHints && isMobileViewport;

  useEffect(() => {
    if (!landingMobileHints || typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }
    const mq = window.matchMedia(`(max-width: ${MOBILE_LANDING_SEARCH_MAX_WIDTH_PX}px)`);
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [landingMobileHints]);

  const peakupHeroCategories = useMemo(
    () => getPeakUpTopLevelSportOptions(),
    []
  );

  const filters = {
    categories: {
      enabled: categories,
      isValid: () => peakupHeroCategories.length > 0,
      render: alignLeft => (
        <div className={css.filterField} key="categories">
          <FilterCategories categories={peakupHeroCategories} alignLeft={alignLeft} />
        </div>
      ),
    },
    keywordSearch: {
      enabled: keywordSearch,
      isValid: () => keywordSearch,
      render: alignLeft => (
        <div className={css.filterField} key="keywordSearch">
          <FilterKeyword />
        </div>
      ),
    },
    locationSearch: {
      enabled: locationSearch,
      isValid: () => locationSearch,
      render: alignLeft => (
        <div className={css.filterField} key="locationSearch">
          <FilterLocation
            setSubmitDisabled={setSubmitDisabled}
            alignLeft={alignLeft}
            landingMobileHints={landingMobileHints}
            isMobileLanding={isMobileLanding}
            locationSearchErrorCode={locationSearchErrorCode}
            onClearGeocodeError={() => setLocationSearchErrorCode(null)}
            onMobileLocationContextChange={setMobileLocationContext}
          />
        </div>
      ),
    },
    dateRange: {
      enabled: dateRange,
      isValid: () => dateRange,
      render: alignLeft => (
        <div className={css.filterField} key="dateRange">
          <FilterDateRange config={config} alignLeft={alignLeft} />
        </div>
      ),
    },
  };

  const addFilters = filterOrder => {
    const enabledFilters = filterOrder.filter(
      key => filters[key]?.enabled && filters[key]?.isValid()
    );

    const totalEnabled = enabledFilters.length;

    return enabledFilters.map((key, index) => {
      const filter = filters[key];
      const isLast = index === totalEnabled - 1;
      const alignLeft = totalEnabled === 1 || !isLast;

      return filter.enabled && filter.isValid() ? filter.render(alignLeft) : null;
    });
  };

  const fieldCountForGrid = Object.values(filters).filter(field => field.enabled && field.isValid())
    .length;

  if (!fieldCountForGrid) {
    return null;
  }

  const onDesktopSubmit = async values => {
    setLocationSearchErrorCode(null);

    const sportKey = resolveCoachMapSportKeyFromLandingForm(
      values?.pub_categoryLevel1,
      location.search
    );
    const path = pathByRouteName('CoachMapPage', routeConfiguration, {});
    const loc = values?.location;
    const selectedPlace = loc?.selectedPlace;
    const hasManualPlace = selectedPlace && String(selectedPlace.address || '').trim() !== '';

    const ll = hasManualPlace ? normalizeGeocoderOriginLatLng(selectedPlace.origin) : null;
    if (ll) {
      const label = String(selectedPlace.address || loc?.search || '').trim();
      const search = buildCoachMapSearchWithManualLocation({
        sportKey,
        lat: ll.lat,
        lng: ll.lng,
        locationLabel: label,
      });
      debugCoachMapLocate('SearchCTA submit → CoachMapPage (manual place)', {
        path,
        search,
        sportKey,
      });
      history.push(`${path}${search}`);
      return;
    }

    startCoachMapLandingGeolocationPrimed();
    const mergedPageSearch = mergeResolvedSportIntoPageSearchForCoachMap(location.search, sportKey);
    const search = coachMapSearchForFreshGeolocationIntent(mergedPageSearch);
    debugCoachMapLocate('SearchCTA submit → CoachMapPage (locate intent)', {
      path,
      search,
      sportKey,
      currentLocationField: isLocationFieldCurrentLocation(loc),
    });
    history.push(`${path}${search}`);
  };

  const handleMobileCTAClick = async (values, ctaDisabled) => {
    if (ctaDisabled || isMobileSubmitting) {
      return;
    }

    setLocationSearchErrorCode(null);
    setIsMobileSubmitting(true);

    try {
      const result = await submitMobileLandingSearch({
        values,
        config,
        history,
        routeConfiguration,
        pageSearch: location.search,
        mobileLocationContext,
      });

      if (!result.ok) {
        setLocationSearchErrorCode(result.errorCode || 'geocode-failed');
      }
    } finally {
      setIsMobileSubmitting(false);
    }
  };

  return (
    <div className={classNames(css.searchBarContainer, getGridCount(fieldCountForGrid))}>
      <FinalForm
        onSubmit={onDesktopSubmit}
        {...props}
        render={({ handleSubmit, values }) => {
          const ctaDisabled = isMobileLanding
            ? !isMobileLandingCTAReady(values, mobileLocationContext)
            : submitDisabled;

          return (
            <Form
              role="search"
              onSubmit={
                isMobileLanding
                  ? event => {
                      event.preventDefault();
                    }
                  : handleSubmit
              }
              className={classNames(css.gridContainer, getGridCount(fieldCountForGrid))}
            >
              {addFilters(['categories', 'keywordSearch', 'locationSearch', 'dateRange'])}

              {isMobileLanding ? (
                <PrimaryButton
                  type="button"
                  disabled={ctaDisabled || isMobileSubmitting}
                  className={classNames(css.submitButton, css.mobileSubmitButton)}
                  onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleMobileCTAClick(values, ctaDisabled);
                  }}
                >
                  {PEAKUP_SEARCH_BUTTON_LABEL}
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  disabled={submitDisabled}
                  className={css.submitButton}
                  type="submit"
                >
                  {PEAKUP_SEARCH_BUTTON_LABEL}
                </PrimaryButton>
              )}
            </Form>
          );
        }}
      />
    </div>
  );
});

SearchCTA.displayName = 'SearchCTA';
