import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { types as sdkTypes } from '../../util/sdkLoader';
import { propTypes } from '../../util/types';

import { isScrollingDisabled } from '../../ducks/ui.duck';

import { Page, SportBar, CoachStickerCard } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import SearchMap from '../SearchPage/SearchMap/SearchMap';

import {
  filterCoachesBySport,
  formatCoachExploreSportSlug,
  parseCoachExploreSearch,
  sortCoachRowsByDistanceKm,
  sdkBoundsFromPlain,
} from '../../util/coachExplore';
import { fetchCoachesExploreThunk } from '../CoachesExplorePage/CoachesExplorePage.duck';

import css from './CoachMapPage.module.css';

const noop = () => {};

/**
 * Coach map: SportBar with winter accordion variants, list + SearchMap.
 * Same query params as Coaches list: ?sport=&lat=&lng=&location=
 */
const CoachMapPage = props => {
  const intl = useIntl();
  const config = useConfiguration();
  const location = useLocation();
  const dispatch = useDispatch();

  const scrollingDisabled = useSelector(isScrollingDisabled);
  const { coaches, fetchStatus, fetchError, boundsPlain } = useSelector(
    state => state.CoachesExplorePage
  );

  const queryExplore = useMemo(() => parseCoachExploreSearch(location.search), [location.search]);

  const [selectedSport, setSelectedSport] = useState('');
  const [activeListingId, setActiveListingId] = useState(null);

  useEffect(() => {
    setSelectedSport(queryExplore.sportKey);
  }, [queryExplore.sportKey]);

  const filteredCoaches = useMemo(() => {
    const bySport = filterCoachesBySport(coaches, selectedSport);
    if (queryExplore.userLat != null && queryExplore.userLng != null) {
      return sortCoachRowsByDistanceKm(bySport, queryExplore.userLat, queryExplore.userLng);
    }
    return bySport;
  }, [coaches, selectedSport, queryExplore.userLat, queryExplore.userLng]);

  const mapListings = useMemo(
    () => filteredCoaches.map(c => c.representativeListing).filter(l => l?.attributes?.geolocation),
    [filteredCoaches]
  );

  const bounds = useMemo(() => sdkBoundsFromPlain(boundsPlain, sdkTypes), [boundsPlain]);

  const center = useMemo(() => {
    if (!boundsPlain) return null;
    return {
      lat: (boundsPlain.neLat + boundsPlain.swLat) / 2,
      lng: (boundsPlain.neLng + boundsPlain.swLng) / 2,
    };
  }, [boundsPlain]);

  const onRetry = useCallback(() => {
    dispatch(fetchCoachesExploreThunk({ config }));
  }, [config, dispatch]);

  const marketplaceName = config.branding.marketplaceName || 'Marketplace';
  const schemaTitle = intl.formatMessage({ id: 'CoachMapPage.schemaTitle' }, { marketplaceName });
  const schemaDescription = intl.formatMessage({ id: 'CoachMapPage.schemaDescription' });

  const loading = fetchStatus === 'loading';
  const failed = fetchStatus === 'failed';

  const headlineSportPhrase = selectedSport.trim()
    ? formatCoachExploreSportSlug(selectedSport)
    : '';
  const hasGeoProximity =
    queryExplore.userLat != null &&
    queryExplore.userLng != null &&
    Number.isFinite(queryExplore.userLat) &&
    Number.isFinite(queryExplore.userLng);
  const hasPlaceLabel = !hasGeoProximity && queryExplore.locationLabel.length > 0;

  return (
    <Page title={schemaTitle} description={schemaDescription} scrollingDisabled={scrollingDisabled}>
      <TopbarContainer />
      <main className={css.root}>
        <header className={css.header}>
          <h1 className={css.title}>
            {headlineSportPhrase ? (
              <FormattedMessage
                id="CoachDirectory.heroTitleWithSport"
                values={{ sport: headlineSportPhrase }}
              />
            ) : (
              <FormattedMessage id="CoachMapPage.title" />
            )}
          </h1>
          <p className={css.subtitle}>
            {hasGeoProximity ? (
              <FormattedMessage id="CoachDirectory.heroSubtitleNearYou" />
            ) : hasPlaceLabel ? (
              <FormattedMessage
                id="CoachDirectory.heroSubtitleInPlace"
                values={{ place: queryExplore.locationLabel }}
              />
            ) : (
              <FormattedMessage id="CoachMapPage.subtitle" />
            )}
          </p>
        </header>

        <div className={css.sportBarWrap}>
          <SportBar
            value={selectedSport}
            onChange={next => {
              setSelectedSport(next);
              setActiveListingId(null);
            }}
            allLabel={intl.formatMessage({ id: 'CoachMapPage.sportAll' })}
            includeWinterVariants
          />
        </div>

        {loading ? (
          <p className={css.status}>
            <FormattedMessage id="CoachesPage.loading" />
          </p>
        ) : null}

        {failed ? (
          <div className={css.errorBox}>
            <p className={css.status}>
              <FormattedMessage id="CoachesPage.error" />
            </p>
            <button type="button" className={css.retry} onClick={onRetry}>
              <FormattedMessage id="CoachesPage.retry" />
            </button>
          </div>
        ) : null}

        {!loading && !failed ? (
          <div className={css.split}>
            <aside
              className={css.sidebar}
              aria-label={intl.formatMessage({ id: 'CoachesPage.title' })}
            >
              {filteredCoaches.length === 0 ? (
                <p className={css.status}>
                  <FormattedMessage id="CoachesPage.empty" />
                </p>
              ) : (
                <div className={css.sidebarList}>
                  {filteredCoaches.map(coach => (
                    <CoachStickerCard
                      key={coach.authorUuid}
                      coach={coach}
                      compact
                      onMouseEnter={() =>
                        setActiveListingId(coach.representativeListing?.id || null)
                      }
                      onMouseLeave={() => setActiveListingId(null)}
                    />
                  ))}
                </div>
              )}
            </aside>

            <div className={css.mapPanel}>
              <div className={css.mapInner}>
                <SearchMap
                  reusableContainerClassName={css.map}
                  rootClassName={css.mapRoot}
                  bounds={bounds}
                  center={center}
                  location={location}
                  listings={mapListings}
                  activeListingId={activeListingId}
                  onMapMoveEnd={noop}
                  messages={intl.messages}
                />
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <FooterContainer />
    </Page>
  );
};

CoachMapPage.propTypes = {
  staticContext: propTypes.staticContext,
};

export default CoachMapPage;
