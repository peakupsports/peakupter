import React, { useMemo, useState } from 'react';
import classNames from 'classnames';
import { Form as FinalForm } from 'react-final-form';
import { useHistory, useLocation } from 'react-router-dom';

// Contexts
import { useRouteConfiguration } from '../../../../context/routeConfigurationContext';
import { useConfiguration } from '../../../../context/configurationContext';

// Utility
import { FormattedMessage } from '../../../../util/reactIntl';
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

  const [submitDisabled, setSubmitDisabled] = useState(false);

  // Landing hero "Your sport" must mirror the SportBar taxonomy/navigation
  // exactly, even if hosted category data is incomplete or still contains
  // legacy categories. Therefore the dropdown reads directly from the shared
  // PeakUp taxonomy source of truth instead of the hosted category list.
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
          <FilterLocation setSubmitDisabled={setSubmitDisabled} alignLeft={alignLeft} />
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

  // Count the number search fields that are enabled
  const fieldCountForGrid = Object.values(filters).filter(field => field.enabled && field.isValid())
    .length;

  //  If no search fields are enabled, we return null (Console won't allow you to enable 0 search fields)
  if (!fieldCountForGrid) {
    return null;
  }

  // PeakUp Landing Page hero CTA — the green "Find your coach" button must
  // route straight to the Coach Map page (the marketplace's primary coach
  // discovery surface). The legacy SearchPage query-param builder that used
  // to convert the hero's sport/location/date/keyword fields into a
  // `/s?...` URL has been intentionally removed: SearchPage is not the
  // destination for this CTA anymore, and CoachMapPage exposes its own
  // (different) URL param schema. `pathByRouteName('CoachMapPage', …)`
  // keeps the path relative ("/coach-map"), so it works identically on
  // localhost, staging, and production.
  //
  // Submit builds the query from Final Form values — **not** from
  // `location.search` alone:
  //  – Manual geocoder place → `?sport=&lat=&lng=&location=` (no `locate=1`).
  //  – Current location or bare submit → `coachMapSearchForFreshGeolocationIntent`
  //    (`locate=1`, `_locatenonce`, primed `getCurrentPosition` gesture).
  // Sport: hero dropdown wins, else existing landing `?sport=` (Topbar).
  const onSubmit = values => {
    const sportKey = resolveCoachMapSportKeyFromLandingForm(
      values?.pub_categoryLevel1,
      location.search
    );
    const path = pathByRouteName('CoachMapPage', routeConfiguration, {});
    const loc = values?.location;

    const hasManualPlace =
      loc?.selectedPlace && String(loc.selectedPlace.address || '').trim() !== '';
    if (hasManualPlace) {
      const ll = normalizeGeocoderOriginLatLng(loc.selectedPlace.origin);
      if (ll) {
        const label = String(loc.selectedPlace.address || loc.search || '').trim();
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

  return (
    <div className={classNames(css.searchBarContainer, getGridCount(fieldCountForGrid))}>
      <FinalForm
        onSubmit={onSubmit}
        {...props}
        render={({ fieldRenderProps, handleSubmit }) => {
          return (
            <Form
              role="search"
              onSubmit={handleSubmit}
              className={classNames(css.gridContainer, getGridCount(fieldCountForGrid))}
            >
              {addFilters(['categories', 'keywordSearch', 'locationSearch', 'dateRange'])}

              <PrimaryButton disabled={submitDisabled} className={css.submitButton} type="submit">
                {PEAKUP_SEARCH_BUTTON_LABEL}
              </PrimaryButton>
            </Form>
          );
        }}
      />
    </div>
  );
});

SearchCTA.displayName = 'SearchCTA';
