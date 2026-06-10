import React, { useCallback, useMemo, useEffect } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';

import appSettings from '../../../config/settings';
import { useConfiguration } from '../../../context/configurationContext';
import { useRouteConfiguration } from '../../../context/routeConfigurationContext';

import { pickBy } from '../../../util/common';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { isMainSearchTypeKeywords, isOriginInUse } from '../../../util/search';
import { parse, stringify } from '../../../util/urlHelpers';
import { createResourceLocatorString, matchPathname, pathByRouteName } from '../../../util/routes';
import {
  buildCoachMapPageBuilderLinkTo,
  coachMapSearchForFreshGeolocationIntent,
  COACH_MAP_DIRECT_GEO_EVENT,
  COACH_MAP_SCROLL_PANEL_EVENT,
  debugCoachMapLocate,
  isLocationFieldCurrentLocation,
  parseCoachExploreSearch,
} from '../../../util/coachExplore';
import {
  Button,
  IconArrowHead,
  LanguageSelector,
  LimitedAccessBanner,
  LinkedLogo,
  Modal,
  ModalMissingInformation,
  SportBar,
} from '../../../components';
import { getSearchPageResourceLocatorStringParams } from '../../SearchPage/SearchPage.shared';

import MenuIcon from './MenuIcon';
import SearchIcon from './SearchIcon';
import TopbarSearchForm from './TopbarSearchForm/TopbarSearchForm';
import TopbarMobileMenu from './TopbarMobileMenu/TopbarMobileMenu';
import TopbarDesktop from './TopbarDesktop/TopbarDesktop';
import TopbarInboxLink from './TopbarInboxLink';

import css from './Topbar.module.css';
import { getCurrentUserTypeRoles, showCreateListingLinkForUser } from '../../../util/userHelpers';
import { showAmbassadorMenuForUser } from '../../../util/ambassadorNav';
import { isPeakUpHqAdmin } from '../../../util/peakupAdmin';
import {
  canUseCoachPlatformMode,
  isCoachPlatformMode,
  readPlatformModeFromStorage,
  resolvePlatformMode,
} from '../../../util/peakupPlatformMode';
import { isTeamProviderProfileUserType, resolveTeamLogoLink } from '../../../util/peakupTeam';
import {
  hydratePlatformMode,
  selectPlatformMode,
  selectPlatformModeHydrated,
  setPlatformMode,
} from '../../../ducks/peakupPlatformMode.duck';
import { PLATFORM_MODE_COACH, PLATFORM_MODE_CUSTOMER } from '../../../util/peakupPlatformMode';
import { isHowItWorksCmsPage, isInstructorsCmsPage } from '../../../util/coachOnboarding';
import useInboxNotificationRefresh from '../../../util/useInboxNotificationRefresh';

const MAX_MOBILE_SCREEN_WIDTH = 1024;

const SEARCH_DISPLAY_ALWAYS = 'always';
const SEARCH_DISPLAY_NOT_LANDING_PAGE = 'notLandingPage';
const SEARCH_DISPLAY_ONLY_SEARCH_PAGE = 'onlySearchPage';
const MOBILE_MENU_BUTTON_ID = 'mobileMenuButton';
const MOBILE_SEARCH_BUTTON_ID = 'mobileSearchButton';

const redirectToURLWithModalState = (history, location, modalStateParam) => {
  const { pathname, search, state } = location;
  const searchString = `?${stringify({ [modalStateParam]: 'open', ...parse(search) })}`;
  history.push(`${pathname}${searchString}`, state);
};

const redirectToURLWithoutModalState = (history, location, modalStateParam) => {
  const { pathname, search, state } = location;
  const queryParams = pickBy(parse(search), (v, k) => {
    return k !== modalStateParam;
  });
  const stringified = stringify(queryParams);
  const searchString = stringified ? `?${stringified}` : '';
  history.push(`${pathname}${searchString}`, state);
};

const isPrimary = o => o.group === 'primary';
const isSecondary = o => o.group === 'secondary';
const compareGroups = (a, b) => {
  const isAHigherGroupThanB = isPrimary(a) && isSecondary(b);
  const isALesserGroupThanB = isSecondary(a) && isPrimary(b);
  // Note: sort order is stable in JS
  return isAHigherGroupThanB ? -1 : isALesserGroupThanB ? 1 : 0;
};
// Returns links in order where primary links are returned first
const sortCustomLinks = customLinks => {
  const links = Array.isArray(customLinks) ? [...customLinks] : [];
  return links.sort(compareGroups);
};

// Resolves in-app links against route configuration
const getResolvedCustomLinks = (customLinks, routeConfiguration, location) => {
  const links = Array.isArray(customLinks) ? customLinks : [];
  const loc = location
    ? { pathname: location.pathname, search: location.search }
    : { pathname: '', search: '' };
  return links.map(linkConfig => {
    const { type, href } = linkConfig;
    const isInternalLink = type === 'internal' || href.charAt(0) === '/';
    if (isInternalLink) {
      // Internal link
      try {
        const testURL = new URL('http://my.marketplace.com' + href);
        const matchedRoutes = matchPathname(testURL.pathname, routeConfiguration);
        if (matchedRoutes.length > 0) {
          const found = matchedRoutes[0];
          const to =
            found.route?.name === 'CoachMapPage'
              ? buildCoachMapPageBuilderLinkTo(loc, href)
              : { search: testURL.search, hash: testURL.hash };
          return {
            ...linkConfig,
            route: {
              name: found.route?.name,
              params: found.params,
              to,
            },
          };
        }
      } catch (e) {
        return linkConfig;
      }
    }
    return linkConfig;
  });
};

const isCMSPage = found =>
  found.route?.name === 'CMSPage' ? `CMSPage:${found.params?.pageId}` : null;
const isInboxPage = found =>
  found.route?.name === 'InboxPage' ? `InboxPage:${found.params?.tab}` : null;
// Find the name of the current route/pathname.
// It's used as handle for currentPage check.
const getResolvedCurrentPage = (location, routeConfiguration) => {
  const matchedRoutes = matchPathname(location.pathname, routeConfiguration);
  if (matchedRoutes.length > 0) {
    const found = matchedRoutes[0];
    const cmsPageName = isCMSPage(found);
    const inboxPageName = isInboxPage(found);
    return cmsPageName ? cmsPageName : inboxPageName ? inboxPageName : `${found.route?.name}`;
  }
};

const GenericError = props => {
  const { show } = props;
  const classes = classNames(css.genericError, {
    [css.genericErrorVisible]: show,
  });
  return show ? (
    <div className={classes} role="alert">
      <div className={css.genericErrorContent}>
        <p className={css.genericErrorText}>
          <FormattedMessage id="Topbar.genericError" />
        </p>
      </div>
    </div>
  ) : null;
};

const TopbarComponent = props => {
  const {
    className,
    rootClassName,
    desktopClassName,
    mobileRootClassName,
    mobileClassName,
    isAuthenticated,
    isLoggedInAs,
    authScopes = [],
    authInProgress,
    currentUser,
    currentUserHasListings,
    currentUserHasOrders,
    currentPage,
    notificationCount = 0,
    currentUserSaleNotificationCount = 0,
    currentUserOrderNotificationCount = 0,
    intl,
    history,
    location,
    onManageDisableScrolling,
    onResendVerificationEmail,
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
    showGenericError,
    disableSearch,
    topbarCenterContent,
    chromeTheme,
    config,
    routeConfiguration,
  } = props;

  const handleSubmit = values => {
    const { currentSearchParams, history, location, config, routeConfiguration } = props;

    const resolvedPage = currentPage || getResolvedCurrentPage(location, routeConfiguration);
    if (
      !isMainSearchTypeKeywords(config) &&
      resolvedPage === 'CoachMapPage' &&
      isLocationFieldCurrentLocation(values?.location)
    ) {
      debugCoachMapLocate('current location clicked', { source: 'TopbarSearchForm', pathname: location.pathname });
      debugCoachMapLocate('requesting geolocation', { source: 'TopbarSearchForm', via: 'URL intent + CoachMapPage effect' });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(COACH_MAP_DIRECT_GEO_EVENT));
      }
      const nextSearch = coachMapSearchForFreshGeolocationIntent(location.search);
      history.push(`${location.pathname}${nextSearch}`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(COACH_MAP_SCROLL_PANEL_EVENT));
      }
      return;
    }

    const topbarSearchParams = () => {
      if (isMainSearchTypeKeywords(config)) {
        return { keywords: values?.keywords };
      }
      // topbar search defaults to 'location' search
      const { search, selectedPlace } = values?.location || {};
      const { origin, bounds } = selectedPlace || {};
      const originMaybe = isOriginInUse(config) ? { origin } : {};

      return {
        ...originMaybe,
        address: search,
        bounds,
      };
    };
    const searchParams = {
      ...currentSearchParams,
      ...topbarSearchParams(),
    };

    const { routeName, pathParams } = getSearchPageResourceLocatorStringParams(
      routeConfiguration,
      location
    );

    history.push(
      createResourceLocatorString(routeName, routeConfiguration, pathParams, searchParams)
    );
  };

  const handleLogout = () => {
    const { onLogout, history, routeConfiguration } = props;
    onLogout().then(() => {
      const path = pathByRouteName('LandingPage', routeConfiguration);

      // In production we ensure that data is really lost,
      // but in development mode we use stored values for debugging
      if (appSettings.dev) {
        history.push(path);
      } else if (typeof window !== 'undefined') {
        window.location = path;
      }

      console.log('logged out'); // eslint-disable-line
    });
  };

  const dispatch = useDispatch();
  const platformMode = useSelector(selectPlatformMode);
  const platformModeHydrated = useSelector(selectPlatformModeHydrated);

  useEffect(() => {
    if (currentUser?.id) {
      dispatch(hydratePlatformMode(currentUser));
    }
  }, [currentUser?.id, dispatch]);

  const canSwitchPlatformMode = canUseCoachPlatformMode(currentUser);
  const effectivePlatformMode = platformModeHydrated
    ? platformMode
    : resolvePlatformMode(currentUser, readPlatformModeFromStorage());
  const teamNavMode = isTeamProviderProfileUserType(currentUser);
  const coachNavMode =
    !teamNavMode && canSwitchPlatformMode && isCoachPlatformMode(effectivePlatformMode);
  const providerNavMode = coachNavMode || teamNavMode;
  const isCoachNavModeReady = !canSwitchPlatformMode || platformModeHydrated;

  useInboxNotificationRefresh({
    enabled: isAuthenticated && !!currentUser?.id,
    debugLabel: 'Topbar',
  });

  const handleExploreAsCustomer = useCallback(() => {
    dispatch(setPlatformMode(PLATFORM_MODE_CUSTOMER));
    history.push(pathByRouteName('LandingPage', routeConfiguration));
  }, [dispatch, history, routeConfiguration]);

  const handleReturnToCoachMode = useCallback(() => {
    dispatch(setPlatformMode(PLATFORM_MODE_COACH));
    history.push(pathByRouteName('CoachDashboardPage', routeConfiguration));
  }, [dispatch, history, routeConfiguration]);

  const showCreateListingsLink = showCreateListingLinkForUser(config, currentUser);
  const { customer: isCustomer, provider: isProvider } = getCurrentUserTypeRoles(
    config,
    currentUser
  );
  const showCoachCalendarLink = Boolean(currentUser && isProvider);
  const showPeakUpHqLink = isPeakUpHqAdmin(currentUser, config);
  const showAmbassadorMenu = showAmbassadorMenuForUser(config, currentUser);

  /**
   * Determine which tab to use in the inbox link:
   * - if only provider role – sales
   * - if only customer role – orders
   * - if both roles – determine by currentUserHasListings value
   */
  const topbarInboxTab = providerNavMode
    ? 'sales'
    : !isCustomer
    ? 'sales'
    : !isProvider
    ? 'orders'
    : currentUserHasListings
    ? 'sales'
    : 'orders';

  const { mobilemenu, mobilesearch, keywords, address, origin, bounds } = parse(location.search, {
    latlng: ['origin'],
    latlngBounds: ['bounds'],
  });

  // Custom links are sorted so that group="primary" are always at the beginning of the list.
  const sortedCustomLinks = sortCustomLinks(config.topbar?.customLinks);
  const customLinks = getResolvedCustomLinks(sortedCustomLinks, routeConfiguration, location);
  const discoveryTopbarEnabled = isCoachNavModeReady && !providerNavMode;
  const topbarCustomLinks = discoveryTopbarEnabled ? customLinks : [];
  const teamLogoLink = teamNavMode ? resolveTeamLogoLink(currentUser) : null;
  const logoLinkName = teamLogoLink
    ? teamLogoLink.linkName
    : coachNavMode
    ? 'CoachDashboardPage'
    : 'LandingPage';
  const logoLinkParams = teamLogoLink?.linkParams;
  const resolvedCurrentPage = currentPage || getResolvedCurrentPage(location, routeConfiguration);
  const isSportPremiumChrome = chromeTheme === 'sportPremium';

  // Pages that render the global SportBar inside the topbar instead of an
  // inline filter row. CoachMapPage owns its own (with winter variants) and
  // passes it explicitly via `topbarCenterContent`, so it isn't listed here.
  const cmsPageId =
    typeof resolvedCurrentPage === 'string' && resolvedCurrentPage.startsWith('CMSPage:')
      ? resolvedCurrentPage.slice('CMSPage:'.length)
      : null;
  const isInstructorsMarketingPage =
    resolvedCurrentPage === 'InstructorsPage' ||
    (cmsPageId ? isInstructorsCmsPage(cmsPageId) : false);
  const isHowItWorksMarketingPage = cmsPageId ? isHowItWorksCmsPage(cmsPageId) : false;

  const CUSTOMER_SPORTBAR_PAGES = new Set([
    'LandingPage',
    'CoachesPage',
    'ProfilePage',
    'ProfilePageVariant',
    'AboutPage',
    'HowItWorksPage',
  ]);
  // Customer/public discovery header only — hidden in coach/team provider nav mode.
  const useSportBarCenter =
    !providerNavMode &&
    !isInstructorsMarketingPage &&
    (CUSTOMER_SPORTBAR_PAGES.has(resolvedCurrentPage) || isHowItWorksMarketingPage);
  const useLandingCenterSlot =
    useSportBarCenter || (resolvedCurrentPage === 'CoachMapPage' && topbarCenterContent);

  // Pages where a SportBar click should update `?sport=` *in place* instead
  // of navigating away. LandingPage is intentionally NOT in this list: from
  // the homepage every chip click must take the user to CoachMapPage so the
  // SportBar acts as a global entry point to the map (the chip-on-LP UX is
  // "discover coaches on the map for sport X").
  const IN_PLACE_SPORTBAR_PAGES = ['CoachesPage', 'CoachMapPage'];

  // Global SportBar is URL-driven: the active chip mirrors `?sport=` so the
  // selection stays in sync as the user navigates between LandingPage,
  // CoachesPage and CoachMapPage without any local state.
  const currentSportFromUrl = useMemo(
    () => parseCoachExploreSearch(location.search).sportKey || '',
    [location.search]
  );

  // Toggle/set the `sport` param on top of the current URL search params.
  // Used both for in-place updates (Coaches / CoachMap) and for the
  // LandingPage → CoachMapPage navigation, so any pre-existing `lat`,
  // `lng`, `location`, `coachId`, … always survive the click.
  const mergeSportIntoSearch = useCallback(
    (currentSearch, next) => {
      const params = parse(currentSearch);
      const merged = { ...params };
      if (next) {
        merged.sport = next;
      } else {
        delete merged.sport;
      }
      return merged;
    },
    []
  );

  // SportBar click routing:
  // - LandingPage (and any other page that isn't a coach list) → push to
  //   CoachMapPage with `?sport=` plus whatever other search params were
  //   already on the LandingPage URL (lat/lng/location/coachId from a
  //   marketing deep-link, …).
  // - CoachesPage → update `?sport=` in place on `/coaches`.
  // - CoachMapPage → update `?sport=` in place on `/coach-map`.
  // In all branches lat/lng/location/coachId are preserved. For the empty
  // `next` ("All sports") we just drop `sport` and keep the rest.
  const handleGlobalSportChange = useCallback(
    next => {
      const merged = mergeSportIntoSearch(location.search, next);
      const isInPlace = IN_PLACE_SPORTBAR_PAGES.includes(resolvedCurrentPage);
      if (isInPlace) {
        const search = stringify(merged);
        history.push(`${location.pathname}${search ? `?${search}` : ''}`);
        return;
      }
      const to = createResourceLocatorString(
        'CoachMapPage',
        routeConfiguration,
        {},
        merged
      );
      history.push(to);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      resolvedCurrentPage,
      location.pathname,
      location.search,
      history,
      routeConfiguration,
      mergeSportIntoSearch,
    ]
  );

  const totalNotificationCount =
    currentUserSaleNotificationCount + currentUserOrderNotificationCount;
  const coachInboxNotificationCount = providerNavMode
    ? currentUserSaleNotificationCount
    : totalNotificationCount;
  const showInboxDot = coachInboxNotificationCount > 0;
  const notificationDot = showInboxDot ? <div className={css.notificationDot} /> : null;

  const hasMatchMedia = typeof window !== 'undefined' && window?.matchMedia;
  const isMobileLayout = hasMatchMedia
    ? window.matchMedia(`(max-width: ${MAX_MOBILE_SCREEN_WIDTH}px)`)?.matches
    : true;
  const isMobileMenuOpen = isMobileLayout && mobilemenu === 'open';
  const isMobileSearchOpen = isMobileLayout && mobilesearch === 'open';

  const customerDiscoveryMobile = !providerNavMode;

  const mobileMenu = (
    <TopbarMobileMenu
      isAuthenticated={isAuthenticated}
      currentUser={currentUser}
      onLogout={handleLogout}
      notificationCount={notificationCount}
      currentPage={resolvedCurrentPage}
      customLinks={topbarCustomLinks}
      showCreateListingsLink={showCreateListingsLink}
      showCoachCalendarLink={showCoachCalendarLink}
      showAmbassadorMenu={showAmbassadorMenu}
      showPeakUpHqLink={showPeakUpHqLink}
      coachNavMode={coachNavMode}
      teamNavMode={teamNavMode}
      canSwitchPlatformMode={canSwitchPlatformMode}
      onExploreAsCustomer={handleExploreAsCustomer}
      onReturnToCoachMode={handleReturnToCoachMode}
      inboxTab={topbarInboxTab}
      customerDiscoveryMenu={customerDiscoveryMobile}
    />
  );

  const topbarSearcInitialValues = () => {
    if (isMainSearchTypeKeywords(config)) {
      return { keywords };
    }

    // Only render current search if full place object is available in the URL params
    const locationFieldsPresent = isOriginInUse(config)
      ? address && origin && bounds
      : address && bounds;
    return {
      location: locationFieldsPresent
        ? {
            search: address,
            selectedPlace: { address, origin, bounds },
          }
        : null,
    };
  };
  const initialSearchFormValues = topbarSearcInitialValues();

  const classes = classNames(rootClassName || css.root, className);

  const { display: searchFormDisplay = SEARCH_DISPLAY_ALWAYS } = config?.topbar?.searchBar || {};

  // Search form is shown conditionally depending on configuration and
  // the current page.
  const showSearchOnAllPages = searchFormDisplay === SEARCH_DISPLAY_ALWAYS;
  const showSearchOnSearchPage =
    searchFormDisplay === SEARCH_DISPLAY_ONLY_SEARCH_PAGE &&
    ['SearchPage', 'SearchPageWithListingType'].includes(resolvedCurrentPage);
  const showSearchNotOnLandingPage =
    searchFormDisplay === SEARCH_DISPLAY_NOT_LANDING_PAGE && resolvedCurrentPage !== 'LandingPage';

  const showSearchForm =
    !disableSearch && (showSearchOnAllPages || showSearchOnSearchPage || showSearchNotOnLandingPage);

  // Single global SportBar shared across LandingPage and CoachesPage.
  // CoachMapPage opts out (it injects its own SportBar with winter variants
  // via `topbarCenterContent`) and on every other page the topbar falls back
  // to the search form / spacer like before.
  const globalSportBarCenterContent = useMemo(() => {
    if (!useSportBarCenter) return null;
    return (
      <div className={css.landingSportBarCenterScale}>
        <SportBar
          value={currentSportFromUrl}
          inTopbar
          onChange={handleGlobalSportChange}
          allLabel={intl.formatMessage({ id: 'SportBar.allSports', defaultMessage: 'All sports' })}
        />
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useSportBarCenter, currentSportFromUrl, handleGlobalSportChange]);

  const showSearchFormEffective =
    discoveryTopbarEnabled &&
    !disableSearch &&
    (showSearchOnAllPages || showSearchOnSearchPage || showSearchNotOnLandingPage);

  const mobileSearchButtonMaybe = showSearchFormEffective ? (
    <Button
      id={MOBILE_SEARCH_BUTTON_ID}
      rootClassName={css.searchMenu}
      onClick={() => redirectToURLWithModalState(history, location, 'mobilesearch')}
      title={intl.formatMessage({ id: 'Topbar.searchIcon' })}
    >
      <SearchIcon
        className={css.searchMenuIcon}
        ariaLabel={intl.formatMessage({ id: 'Topbar.searchIcon' })}
      />
    </Button>
  ) : null;

  const mobileCoachInboxMaybe =
    providerNavMode && isAuthenticated ? (
      <TopbarInboxLink
        id="inbox-link-mobile"
        saleNotificationCount={currentUserSaleNotificationCount}
        orderNotificationCount={currentUserOrderNotificationCount}
        inboxTab={topbarInboxTab}
        coachNavMode={providerNavMode}
        currentPage={resolvedCurrentPage}
        variant="mobile"
      />
    ) : null;

  const mobileLanguageSelector = <LanguageSelector variant="mobile" />;

  const mobileMenuButton = (
    <Button
      id={MOBILE_MENU_BUTTON_ID}
      rootClassName={css.menu}
      onClick={() => redirectToURLWithModalState(history, location, 'mobilemenu')}
      title={intl.formatMessage({ id: 'Topbar.menuIcon' })}
    >
      <MenuIcon
        className={css.menuIcon}
        ariaLabel={intl.formatMessage({ id: 'Topbar.menuIcon' })}
      />
      {notificationDot}
    </Button>
  );

  const mobileLogoLink = (
    <LinkedLogo
      id="logo-topbar-mobile"
      layout="mobile"
      className={customerDiscoveryMobile ? css.mobileLogoLink : null}
      alt={intl.formatMessage({ id: 'Topbar.logoIcon' })}
      linkToExternalSite={config?.topbar?.logoLink}
      linkName={logoLinkName}
      linkParams={logoLinkParams}
    />
  );

  const handleSkipToMainContent = e => {
    e.preventDefault();
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Focus the main content for screen readers
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      // Remove tabindex after blur to avoid tabbing into it later
      mainContent.addEventListener(
        'blur',
        () => {
          mainContent.removeAttribute('tabindex');
        },
        { once: true }
      );
    }
  };

  return (
    <div className={classes}>
      <Button onClick={handleSkipToMainContent} className={css.skipToMainContent}>
        <FormattedMessage id="Topbar.skipToMainContent" />
        <IconArrowHead direction="right" size="small" rootClassName={css.skiptoMainArrow} />
      </Button>
      <LimitedAccessBanner
        isAuthenticated={isAuthenticated}
        isLoggedInAs={isLoggedInAs}
        authScopes={authScopes}
        currentUser={currentUser}
        onLogout={handleLogout}
        currentPage={resolvedCurrentPage}
      />
      <nav
        className={classNames(
          mobileRootClassName || css.container,
          isSportPremiumChrome ? css.containerSportPremium : null,
          providerNavMode ? css.containerCoachNav : null,
          customerDiscoveryMobile ? css.containerCustomerDiscovery : null,
          resolvedCurrentPage === 'CoachMapPage' ? css.containerCoachMap : null,
          mobileClassName
        )}
      >
        {providerNavMode ? (
          <>
            {mobileMenuButton}
            {mobileLogoLink}
            <div className={css.mobileRightSlot}>
              {mobileLanguageSelector}
              {isAuthenticated ? mobileCoachInboxMaybe : <div className={css.searchMenu} />}
            </div>
          </>
        ) : (
          <>
            {mobileLogoLink}
            <div className={css.mobileRightSlot}>
              {mobileLanguageSelector}
              {mobileSearchButtonMaybe}
              {mobileMenuButton}
            </div>
          </>
        )}
      </nav>
      <div className={css.desktop}>
        <TopbarDesktop
          className={desktopClassName}
          chromeTheme={chromeTheme}
          currentUserHasListings={currentUserHasListings}
          currentUser={currentUser}
          currentPage={resolvedCurrentPage}
          initialSearchFormValues={initialSearchFormValues}
          intl={intl}
          isAuthenticated={isAuthenticated}
          notificationCount={notificationCount}
          currentUserSaleNotificationCount={currentUserSaleNotificationCount}
          currentUserOrderNotificationCount={currentUserOrderNotificationCount}
          onLogout={handleLogout}
          onSearchSubmit={handleSubmit}
          config={config}
          customLinks={topbarCustomLinks}
          showSearchForm={
            useSportBarCenter || (resolvedCurrentPage === 'CoachMapPage' && topbarCenterContent)
              ? false
              : discoveryTopbarEnabled && showSearchFormEffective
          }
          showCreateListingsLink={showCreateListingsLink}
          showCoachCalendarLink={showCoachCalendarLink}
          coachNavMode={coachNavMode}
          teamNavMode={teamNavMode}
          canSwitchPlatformMode={canSwitchPlatformMode}
          onExploreAsCustomer={handleExploreAsCustomer}
          onReturnToCoachMode={handleReturnToCoachMode}
          logoLinkName={logoLinkName}
          logoLinkParams={logoLinkParams}
          inboxTab={topbarInboxTab}
          topbarCenterContent={
            topbarCenterContent || (useSportBarCenter ? globalSportBarCenterContent : null)
          }
          useLandingCenterSlot={useLandingCenterSlot}
          compactMarketingHeader={isInstructorsMarketingPage}
        />
      </div>
      <Modal
        id="TopbarMobileMenu"
        containerClassName={classNames(
          css.modalContainer,
          isSportPremiumChrome ? css.modalContainerSportPremium : null
        )}
        isOpen={isMobileMenuOpen}
        onClose={() => redirectToURLWithoutModalState(history, location, 'mobilemenu')}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
        focusElementId={MOBILE_MENU_BUTTON_ID}
      >
        {authInProgress ? null : mobileMenu}
      </Modal>
      <Modal
        id="TopbarMobileSearch"
        containerClassName={css.modalContainerSearchForm}
        isOpen={isMobileSearchOpen}
        onClose={() => redirectToURLWithoutModalState(history, location, 'mobilesearch')}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
        focusElementId={MOBILE_SEARCH_BUTTON_ID}
      >
        <div className={css.searchContainer}>
          <TopbarSearchForm
            onSubmit={handleSubmit}
            initialValues={initialSearchFormValues}
            isMobile
            appConfig={config}
          />
          <p className={css.mobileHelp}>
            <FormattedMessage id="Topbar.mobileSearchHelp" />
          </p>
        </div>
      </Modal>
      <ModalMissingInformation
        id="MissingInformationReminder"
        containerClassName={css.missingInformationModal}
        currentUser={currentUser}
        currentUserHasListings={currentUserHasListings}
        currentUserHasOrders={currentUserHasOrders}
        location={location}
        onManageDisableScrolling={onManageDisableScrolling}
        onResendVerificationEmail={onResendVerificationEmail}
        sendVerificationEmailInProgress={sendVerificationEmailInProgress}
        sendVerificationEmailError={sendVerificationEmailError}
      />

      <GenericError show={showGenericError} />
    </div>
  );
};

/**
 * Topbar containing logo, main search and navigation links.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {Object} props.desktopClassName add more style rules for TopbarDesktop
 * @param {Object} props.mobileRootClassName overwrite mobile layout root classes
 * @param {Object} props.mobileClassName add more style rules for mobile layout
 * @param {boolean} props.isAuthenticated
 * @param {boolean} props.isLoggedInAs
 * @param {Object} props.currentUser
 * @param {boolean} props.currentUserHasListings
 * @param {boolean} props.currentUserHasOrders
 * @param {string} props.currentPage
 * @param {number} props.notificationCount
 * @param {Function} props.onLogout
 * @param {Function} props.onManageDisableScrolling
 * @param {Function} props.onResendVerificationEmail
 * @param {Object} props.sendVerificationEmailInProgress
 * @param {Object} props.sendVerificationEmailError
 * @param {boolean} props.showGenericError
 * @param {Object} props.history
 * @param {Function} props.history.push
 * @param {Object} props.location
 * @param {string} props.location.search '?foo=bar'
 * @returns {JSX.Element} topbar component
 */
const Topbar = props => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();
  return (
    <TopbarComponent
      config={config}
      routeConfiguration={routeConfiguration}
      intl={intl}
      {...props}
    />
  );
};

export default Topbar;
