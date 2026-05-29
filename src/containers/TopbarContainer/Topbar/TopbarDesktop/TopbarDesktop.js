import React, { useState, useEffect } from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../../util/reactIntl';
import { isPeakUpHqAdmin, isPeakUpHqRouteName } from '../../../../util/peakupAdmin';
import { showAmbassadorMenuForUser, isAmbassadorSectionRouteName } from '../../../../util/ambassadorNav';
import { ACCOUNT_SETTINGS_PAGES } from '../../../../routing/routeConfiguration';
import {
  Avatar,
  InlineTextButton,
  LinkedLogo,
  Menu,
  MenuLabel,
  MenuContent,
  MenuItem,
  NamedLink,
} from '../../../../components';

import TopbarSearchForm from '../TopbarSearchForm/TopbarSearchForm';
import CustomLinksMenu from './CustomLinksMenu/CustomLinksMenu';
import PeakUpHqIcon from '../../../PeakUpHq/PeakUpHqIcons';
import TopbarInboxLink from '../TopbarInboxLink';
import { CreateServiceProfileMenuItem } from '../TopbarCreateServiceLink';

import css from './TopbarDesktop.module.css';

const SignupLink = () => {
  return (
    <NamedLink id="signup-link" name="SignupPage" className={css.topbarLink}>
      <span className={css.topbarLinkLabel}>
        <FormattedMessage id="TopbarDesktop.signup" />
      </span>
    </NamedLink>
  );
};

const LoginLink = () => {
  return (
    <NamedLink id="login-link" name="LoginPage" className={css.topbarLink}>
      <span className={css.topbarLinkLabel}>
        <FormattedMessage id="TopbarDesktop.login" />
      </span>
    </NamedLink>
  );
};

const ProfileMenu = ({
  currentPage,
  currentUser,
  onLogout,
  showManageListingsLink,
  showCoachCalendarLink,
  showAmbassadorMenu,
  showPeakUpHqLink,
  coachNavMode,
  teamNavMode = false,
  canSwitchPlatformMode,
  onExploreAsCustomer,
  onReturnToCoachMode,
  inboxTab,
  intl,
}) => {
  const [ambassadorExpanded, setAmbassadorExpanded] = useState(() =>
    isAmbassadorSectionRouteName(currentPage)
  );

  useEffect(() => {
    if (isAmbassadorSectionRouteName(currentPage)) {
      setAmbassadorExpanded(true);
    }
  }, [currentPage]);

  const currentPageClass = page => {
    const isAccountSettingsPage =
      page === 'AccountSettingsPage' && ACCOUNT_SETTINGS_PAGES.includes(currentPage);
    const isInboxPage =
      page?.indexOf('InboxPage') === 0 && currentPage?.indexOf('InboxPage') === 0;
    return currentPage === page || isAccountSettingsPage || isInboxPage ? css.currentPage : null;
  };

  const ambassadorChildItemClass = classNames(
    css.menuAmbassadorChildItem,
    ambassadorExpanded ? css.menuAmbassadorChildItemExpanded : null
  );

  const dashboardLink = (
    <MenuItem key="CoachDashboardPage">
      <NamedLink
        className={classNames(
          css.menuLink,
          css.menuLinkWithIcon,
          css.menuLinkDashboard,
          currentPageClass('CoachDashboardPage')
        )}
        name="CoachDashboardPage"
      >
        <span className={css.menuItemBorder} />
        <PeakUpHqIcon name="dashboard" className={css.menuLinkIconDashboard} />
        <span className={css.menuLinkText}>
          <FormattedMessage id="TopbarDesktop.dashboardLink" />
        </span>
      </NamedLink>
    </MenuItem>
  );

  const teamDashboardLink = (
    <MenuItem key="TeamDashboard">
      <NamedLink
        className={classNames(
          css.menuLink,
          css.menuLinkWithIcon,
          css.menuLinkDashboard,
          currentPageClass('TeamDashboardPage')
        )}
        name="TeamDashboardPage"
      >
        <span className={css.menuItemBorder} />
        <PeakUpHqIcon name="dashboard" className={css.menuLinkIconDashboard} />
        <span className={css.menuLinkText}>
          <FormattedMessage id="TopbarDesktop.teamDashboardLink" />
        </span>
      </NamedLink>
    </MenuItem>
  );

  const customerDashboardLink = (
    <MenuItem key="CustomerDashboard">
      <NamedLink
        className={classNames(
          css.menuLink,
          css.menuLinkWithIcon,
          css.menuLinkDashboard,
          currentPageClass('CustomerDashboardPage')
        )}
        name="CustomerDashboardPage"
      >
        <span className={css.menuItemBorder} />
        <PeakUpHqIcon name="dashboard" className={css.menuLinkIconDashboard} />
        <span className={css.menuLinkText}>
          <FormattedMessage id="TopbarDesktop.customerDashboardLink" />
        </span>
      </NamedLink>
    </MenuItem>
  );

  const createServiceLink = showManageListingsLink ? (
    <MenuItem key="NewListingPage">
      <CreateServiceProfileMenuItem currentPageClass={currentPageClass} />
    </MenuItem>
  ) : null;

  const listingsLink = showManageListingsLink ? (
    <MenuItem key="ManageListingsPage">
      <NamedLink
        className={classNames(css.menuLink, currentPageClass('ManageListingsPage'))}
        name="ManageListingsPage"
      >
        <span className={css.menuItemBorder} />
        <FormattedMessage id="TopbarDesktop.listingsLink" />
      </NamedLink>
    </MenuItem>
  ) : null;

  const calendarLink = (
    <MenuItem key="CoachCalendarPage">
      <NamedLink
        className={classNames(css.menuLink, currentPageClass('CoachCalendarPage'))}
        name="CoachCalendarPage"
      >
        <span className={css.menuItemBorder} />
        <FormattedMessage id="TopbarDesktop.coachCalendarLink" />
      </NamedLink>
    </MenuItem>
  );

  const earningsLink = (
    <MenuItem key="CoachEarningsPage">
      <NamedLink
        className={classNames(css.menuLink, currentPageClass('CoachEarningsPage'))}
        name="CoachEarningsPage"
      >
        <span className={css.menuItemBorder} />
        <FormattedMessage id="TopbarDesktop.coachEarningsLink" />
      </NamedLink>
    </MenuItem>
  );

  const requestsLink = (
    <MenuItem key="InboxPageRequests">
      <NamedLink
        className={classNames(css.menuLink, currentPageClass(`InboxPage:${inboxTab}`))}
        name="InboxPage"
        params={{ tab: inboxTab }}
      >
        <span className={css.menuItemBorder} />
        <FormattedMessage id="TopbarDesktop.requestsLink" />
      </NamedLink>
    </MenuItem>
  );

  const profileSettingsLink = (
    <MenuItem key="ProfileSettingsPage">
      <NamedLink
        className={classNames(css.menuLink, currentPageClass('ProfileSettingsPage'))}
        name="ProfileSettingsPage"
      >
        <span className={css.menuItemBorder} />
        <FormattedMessage id="TopbarDesktop.profileSettingsLink" />
      </NamedLink>
    </MenuItem>
  );

  const accountSettingsLink = (
    <MenuItem key="AccountSettingsPage">
      <NamedLink
        className={classNames(css.menuLink, currentPageClass('AccountSettingsPage'))}
        name="AccountSettingsPage"
      >
        <span className={css.menuItemBorder} />
        <FormattedMessage id="TopbarDesktop.accountSettingsLink" />
      </NamedLink>
    </MenuItem>
  );

  const ambassadorMenuItems = showAmbassadorMenu
    ? [
        <MenuItem key="AmbassadorSeparatorBefore" rootClassName={css.menuSeparatorItem}>
          <span
            className={classNames(css.menuSeparator, css.menuSeparatorAmbassador)}
            aria-hidden="true"
          />
        </MenuItem>,
        <MenuItem key="AmbassadorToggle" rootClassName={css.menuAmbassadorToggleItem}>
          <InlineTextButton
            rootClassName={classNames(
              css.menuAmbassadorToggle,
              ambassadorExpanded ? css.menuAmbassadorToggleOpen : null
            )}
            aria-expanded={ambassadorExpanded}
            aria-controls="profile-menu-ambassador-program profile-menu-ambassador-referral"
            onClick={() => setAmbassadorExpanded(expanded => !expanded)}
          >
            <span className={css.menuAmbassadorToggleInner}>
              <FormattedMessage id="TopbarDesktop.ambassadorToolsLink" />
              <span className={css.menuAmbassadorChevron} aria-hidden="true" />
            </span>
          </InlineTextButton>
        </MenuItem>,
        <MenuItem key="AmbassadorSeparatorAfter" rootClassName={css.menuSeparatorItem}>
          <span
            className={classNames(css.menuSeparator, css.menuSeparatorAmbassador)}
            aria-hidden="true"
          />
        </MenuItem>,
        <MenuItem key="AmbassadorProgramPage" rootClassName={ambassadorChildItemClass}>
          <NamedLink
            className={classNames(
              css.menuLink,
              css.menuLinkAmbassador,
              css.menuLinkAmbassadorNested,
              currentPage === 'AmbassadorProgramPage' && css.currentPage
            )}
            name="AmbassadorProgramPage"
            tabIndex={ambassadorExpanded ? undefined : -1}
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.ambassadorProgramLink" />
          </NamedLink>
        </MenuItem>,
        <MenuItem key="ReferralCenterPage" rootClassName={ambassadorChildItemClass}>
          <NamedLink
            className={classNames(
              css.menuLink,
              css.menuLinkAmbassador,
              css.menuLinkAmbassadorNested,
              currentPage === 'ReferralCenterPage' && css.currentPage
            )}
            name="ReferralCenterPage"
            tabIndex={ambassadorExpanded ? undefined : -1}
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.referralCenterLink" />
          </NamedLink>
        </MenuItem>,
      ]
    : [];

  const peakUpHqLink = showPeakUpHqLink ? (
    <MenuItem key="PeakUpHQPage">
      <NamedLink
        className={classNames(
          css.menuLink,
          css.menuLinkWithIcon,
          css.menuLinkPeakUpHq,
          isPeakUpHqRouteName(currentPage) && css.currentPage
        )}
        name="PeakUpHQPage"
      >
        <span className={css.menuItemBorder} />
        <PeakUpHqIcon name="hq" className={css.menuLinkIconPeakUpHq} />
        <span className={css.menuLinkText}>
          <FormattedMessage id="TopbarDesktop.peakUpHqLink" />
        </span>
      </NamedLink>
    </MenuItem>
  ) : null;

  const exploreAsCustomerItem = (
    <MenuItem key="ExploreAsCustomer">
      <InlineTextButton rootClassName={css.menuModeSwitch} onClick={onExploreAsCustomer}>
        <span className={css.menuItemBorder} />
        <FormattedMessage id="TopbarDesktop.exploreAsCustomerLink" />
      </InlineTextButton>
    </MenuItem>
  );

  const returnToCoachItem = (
    <MenuItem key="ReturnToCoachMode">
      <InlineTextButton rootClassName={classNames(css.menuModeSwitch, css.menuModeSwitchCoach)} onClick={onReturnToCoachMode}>
        <span className={css.menuItemBorder} />
        <PeakUpHqIcon name="dashboard" className={css.menuLinkIconDashboard} />
        <span className={css.menuLinkText}>
          <FormattedMessage id="TopbarDesktop.returnToCoachDashboardLink" />
        </span>
      </InlineTextButton>
    </MenuItem>
  );

  const modeSeparator = (
    <MenuItem key="ModeSeparator" rootClassName={css.menuSeparatorItem}>
      <span className={css.menuSeparator} aria-hidden="true" />
    </MenuItem>
  );

  const logoutItem = (
    <MenuItem key="logout">
      <InlineTextButton rootClassName={css.logoutButton} onClick={onLogout}>
        <span className={css.menuItemBorder} />
        <FormattedMessage id="TopbarDesktop.logout" />
      </InlineTextButton>
    </MenuItem>
  );

  let menuItems = [];

  if (teamNavMode) {
    menuItems = [teamDashboardLink, requestsLink, accountSettingsLink, peakUpHqLink, logoutItem];
  } else if (coachNavMode) {
    menuItems = [
      dashboardLink,
      createServiceLink,
      listingsLink,
      calendarLink,
      earningsLink,
      requestsLink,
      ...ambassadorMenuItems,
      profileSettingsLink,
      modeSeparator,
      exploreAsCustomerItem,
      peakUpHqLink,
      logoutItem,
    ];
  } else if (canSwitchPlatformMode) {
    menuItems = [
      profileSettingsLink,
      accountSettingsLink,
      modeSeparator,
      returnToCoachItem,
      peakUpHqLink,
      logoutItem,
    ];
  } else if (showCoachCalendarLink) {
    menuItems = [
      dashboardLink,
      createServiceLink,
      listingsLink,
      calendarLink,
      earningsLink,
      profileSettingsLink,
      accountSettingsLink,
      ...ambassadorMenuItems,
      peakUpHqLink,
      logoutItem,
    ];
  } else {
    menuItems = [customerDashboardLink, profileSettingsLink, accountSettingsLink, peakUpHqLink, logoutItem];
  }

  menuItems = menuItems.filter(Boolean);

  return (
    <Menu skipFocusOnNavigation={true}>
      <MenuLabel
        id="profile-menu-label"
        className={css.profileMenuLabel}
        isOpenClassName={css.profileMenuIsOpen}
        ariaLabel={intl.formatMessage({ id: 'TopbarDesktop.screenreader.profileMenu' })}
      >
        <Avatar className={css.avatar} user={currentUser} disableProfileLink />
      </MenuLabel>
      <MenuContent className={css.profileMenuContent}>{menuItems}</MenuContent>
    </Menu>
  );
};

/**
 * Topbar for desktop layout
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {CurrentUser} props.currentUser API entity
 * @param {string?} props.currentPage
 * @param {boolean} props.isAuthenticated
 * @param {number} props.notificationCount
 * @param {Function} props.onLogout
 * @param {Function} props.onSearchSubmit
 * @param {Object?} props.initialSearchFormValues
 * @param {Object} props.intl
 * @param {Object} props.config
 * @param {boolean} props.showSearchForm
 * @param {boolean} props.showCreateListingsLink
 * @param {string} props.inboxTab
 * @returns {JSX.Element} search icon
 */
const TopbarDesktop = props => {
  const {
    className,
    config,
    customLinks,
    currentUser,
    currentPage,
    chromeTheme,
    rootClassName,
    notificationCount = 0,
    currentUserSaleNotificationCount = 0,
    currentUserOrderNotificationCount = 0,
    intl,
    isAuthenticated,
    onLogout,
    onSearchSubmit,
    initialSearchFormValues = {},
    showSearchForm,
    showCreateListingsLink,
    showCoachCalendarLink,
    coachNavMode,
    teamNavMode = false,
    canSwitchPlatformMode,
    onExploreAsCustomer,
    onReturnToCoachMode,
    logoLinkName = 'LandingPage',
    logoLinkParams,
    inboxTab,
    topbarCenterContent,
  } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const marketplaceName = config.marketplaceName;
  const authenticatedOnClientSide = mounted && isAuthenticated;
  const isAuthenticatedOrJustHydrated = isAuthenticated || !mounted;
  const providerNavMode = coachNavMode || teamNavMode;

  const giveSpaceForSearch = customLinks == null || customLinks?.length === 0;
  const classes = classNames(
    rootClassName || css.root,
    chromeTheme === 'sportPremium' ? css.rootSportPremium : null,
    providerNavMode ? css.rootCoachNav : null,
    currentPage === 'CoachMapPage' ? css.rootCoachMap : null,
    className
  );

  const inboxLinkMaybe = authenticatedOnClientSide ? (
    <TopbarInboxLink
      saleNotificationCount={currentUserSaleNotificationCount}
      orderNotificationCount={currentUserOrderNotificationCount}
      inboxTab={inboxTab}
      coachNavMode={providerNavMode}
      currentPage={currentPage}
      className={css.topbarLink}
      labelClassName={providerNavMode ? undefined : css.topbarLinkLabel}
    />
  ) : null;

  const showPeakUpHqLink = isPeakUpHqAdmin(currentUser, config);
  const showAmbassadorMenu = showAmbassadorMenuForUser(config, currentUser);

  const profileMenuMaybe = authenticatedOnClientSide ? (
    <ProfileMenu
      currentPage={currentPage}
      currentUser={currentUser}
      onLogout={onLogout}
      showManageListingsLink={showCreateListingsLink}
      showCoachCalendarLink={showCoachCalendarLink}
      showAmbassadorMenu={showAmbassadorMenu}
      showPeakUpHqLink={showPeakUpHqLink}
      coachNavMode={coachNavMode}
      teamNavMode={teamNavMode}
      canSwitchPlatformMode={canSwitchPlatformMode}
      onExploreAsCustomer={onExploreAsCustomer}
      onReturnToCoachMode={onReturnToCoachMode}
      inboxTab={inboxTab}
      intl={intl}
    />
  ) : null;

  const signupLinkMaybe = isAuthenticatedOrJustHydrated ? null : <SignupLink />;
  const loginLinkMaybe = isAuthenticatedOrJustHydrated ? null : <LoginLink />;

  const searchFormMaybe = showSearchForm ? (
    <TopbarSearchForm
      className={classNames(css.searchLink, { [css.takeAvailableSpace]: giveSpaceForSearch })}
      desktopInputRoot={css.topbarSearchWithLeftPadding}
      onSubmit={onSearchSubmit}
      initialValues={initialSearchFormValues}
      appConfig={config}
    />
  ) : topbarCenterContent ? (
    <div
      className={classNames(
        css.centerSlot,
        { [css.takeAvailableSpace]: giveSpaceForSearch },
        ['LandingPage', 'CoachMapPage', 'CoachesPage'].includes(currentPage)
          ? css.centerSlotLanding
          : null
      )}
    >
      {topbarCenterContent}
    </div>
  ) : (
    <div
      className={classNames(css.spacer, css.topbarSearchWithLeftPadding, {
        [css.takeAvailableSpace]: giveSpaceForSearch,
      })}
    />
  );

  const rightActionsMaybe = (
    <>
      {!providerNavMode ? (
        <CustomLinksMenu
          currentPage={currentPage}
          customLinks={customLinks}
          intl={intl}
          hasClientSideContentReady={authenticatedOnClientSide || !isAuthenticatedOrJustHydrated}
        />
      ) : null}
      {inboxLinkMaybe}
      {profileMenuMaybe}
      {signupLinkMaybe}
      {loginLinkMaybe}
    </>
  );

  return (
    <nav
      className={classes}
      aria-label={intl.formatMessage({ id: 'TopbarDesktop.screenreader.topbarNavigation' })}
    >
      <div className={css.leftSlot}>
        <LinkedLogo
          id="logo-topbar-desktop"
          className={css.logoLink}
          logoClassName={css.logoWrap}
          logoImageClassName={css.logoImage}
          layout="desktop"
          alt={intl.formatMessage({ id: 'TopbarDesktop.logo' }, { marketplaceName })}
          linkToExternalSite={config?.topbar?.logoLink}
          linkName={logoLinkName}
          linkParams={logoLinkParams}
        />
      </div>

      <div className={css.middleSlot}>{searchFormMaybe}</div>

      <div className={css.rightSlot}>{rightActionsMaybe}</div>
    </nav>
  );
};

export default TopbarDesktop;
