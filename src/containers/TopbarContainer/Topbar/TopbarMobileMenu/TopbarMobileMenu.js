/**
 *  TopbarMobileMenu prints the menu content for authenticated user or
 * shows login actions for those who are not authenticated.
 */
import React, { useEffect, useState } from 'react';
import classNames from 'classnames';

import { ACCOUNT_SETTINGS_PAGES } from '../../../../routing/routeConfiguration';
import { FormattedMessage } from '../../../../util/reactIntl';
import { ensureCurrentUser } from '../../../../util/data';
import { isPeakUpHqRouteName } from '../../../../util/peakupAdmin';
import { isAmbassadorSectionRouteName } from '../../../../util/ambassadorNav';

import {
  AvatarLarge,
  ExternalLink,
  InlineTextButton,
  LanguageSelector,
  NamedLink,
  NotificationBadge,
} from '../../../../components';

import PeakUpHqIcon from '../../../PeakUpHq/PeakUpHqIcons';

import css from './TopbarMobileMenu.module.css';
import { CreateServiceMobileNavItem } from '../TopbarCreateServiceLink';

const CustomLinkComponent = ({ linkConfig, currentPage }) => {
  const { group, text, type, href, route } = linkConfig;
  const getCurrentPageClass = page => {
    const hasPageName = name => currentPage?.indexOf(name) === 0;
    const isCMSPage = pageId => hasPageName('CMSPage') && currentPage === `${page}:${pageId}`;
    const isInboxPage = tab => hasPageName('InboxPage') && currentPage === `${page}:${tab}`;
    const isCurrentPage = currentPage === page;

    return isCMSPage(route?.params?.pageId) || isInboxPage(route?.params?.tab) || isCurrentPage
      ? css.currentPage
      : null;
  };

  if (type === 'internal' && route) {
    const { name, params, to } = route || {};
    const className = classNames(css.navigationLink, getCurrentPageClass(name));
    return (
      <li className={className}>
        <NamedLink name={name} params={params} to={to}>
          <span className={css.menuItemBorder} />
          {text}
        </NamedLink>
      </li>
    );
  }
  return (
    <li className={css.navigationLink}>
      <ExternalLink href={href}>
        <span className={css.menuItemBorder} />
        {text}
      </ExternalLink>
    </li>
  );
};

/**
 * Menu for mobile layout (opens through hamburger icon)
 */
const TopbarMobileMenu = props => {
  const {
    isAuthenticated,
    currentPage,
    inboxTab,
    currentUser,
    notificationCount = 0,
    customLinks,
    onLogout,
    showCreateListingsLink,
    showCoachCalendarLink,
    showAmbassadorMenu,
    showPeakUpHqLink,
    coachNavMode,
    teamNavMode = false,
    canSwitchPlatformMode,
    onExploreAsCustomer,
    onReturnToCoachMode,
    intl,
    customerDiscoveryMenu = false,
  } = props;

  const user = ensureCurrentUser(currentUser);
  const [ambassadorExpanded, setAmbassadorExpanded] = useState(() =>
    isAmbassadorSectionRouteName(currentPage)
  );

  useEffect(() => {
    if (isAmbassadorSectionRouteName(currentPage)) {
      setAmbassadorExpanded(true);
    }
  }, [currentPage]);

  const ambassadorChildClass = classNames(
    css.ambassadorChildItem,
    ambassadorExpanded ? css.ambassadorChildItemExpanded : null
  );

  const extraLinks = customLinks.map((linkConfig, index) => {
    return (
      <CustomLinkComponent
        key={`${linkConfig.text}_${index}`}
        linkConfig={linkConfig}
        currentPage={currentPage}
      />
    );
  });

  if (!isAuthenticated) {
    const signup = (
      <NamedLink name="SignupPage" className={css.signupLink}>
        <FormattedMessage id="TopbarMobileMenu.signupLink" />
      </NamedLink>
    );

    const login = (
      <NamedLink name="LoginPage" className={css.loginLink}>
        <FormattedMessage id="TopbarMobileMenu.loginLink" />
      </NamedLink>
    );

    if (customerDiscoveryMenu) {
      return (
        <nav className={css.root}>
          <div className={css.content}>
            <ul className={css.customLinksWrapper}>{extraLinks}</ul>
            <div className={css.unauthorizedActions}>{signup}{login}</div>
            <div className={css.spacer} />
          </div>
        </nav>
      );
    }

    return (
      <nav className={css.root}>
        <div className={css.content}>
          <div className={css.unauthorizedHero}>
            <h2 className={css.unauthorizedTitle}>
              <FormattedMessage id="TopbarMobileMenu.unauthorizedTitle" />
            </h2>
            <p className={css.unauthorizedSubtitle}>
              <FormattedMessage id="TopbarMobileMenu.unauthorizedSubtitle" />
            </p>
            <div className={css.unauthorizedActions}>
              {signup}
              {login}
            </div>
          </div>

          <ul className={css.customLinksWrapper}>{extraLinks}</ul>

          <LanguageSelector variant="mobileMenu" />

          <div className={css.spacer} />
        </div>
      </nav>
    );
  }

  const notificationCountBadge =
    notificationCount > 0 ? (
      <NotificationBadge className={css.notificationBadge} count={notificationCount} />
    ) : null;

  const displayName = user.attributes.profile.firstName;
  const currentPageClass = page => {
    const isAccountSettingsPage =
      page === 'AccountSettingsPage' && ACCOUNT_SETTINGS_PAGES.includes(currentPage);
    const isInboxPage = currentPage?.indexOf('InboxPage') === 0 && page?.indexOf('InboxPage') === 0;
    return currentPage === page || isAccountSettingsPage || isInboxPage ? css.currentPage : null;
  };

  const inboxLink = (
    <li className={classNames(css.inbox, currentPageClass(`InboxPage:${inboxTab}`))}>
      <NamedLink name="InboxPage" params={{ tab: inboxTab }}>
        <FormattedMessage id="TopbarMobileMenu.inboxLink" />
        {notificationCountBadge}
      </NamedLink>
    </li>
  );

  const dashboardLink = (
    <li className={classNames(css.navigationLink, currentPageClass('CoachDashboardPage'))}>
      <NamedLink name="CoachDashboardPage">
        <span className={css.dashboardNavInner}>
          <PeakUpHqIcon name="dashboard" className={css.dashboardNavIcon} />
          <FormattedMessage id="TopbarMobileMenu.dashboardLink" />
        </span>
      </NamedLink>
    </li>
  );

  const teamDashboardLink = (
    <li className={classNames(css.navigationLink, currentPageClass('TeamDashboardPage'))}>
      <NamedLink name="TeamDashboardPage">
        <span className={css.dashboardNavInner}>
          <PeakUpHqIcon name="dashboard" className={css.dashboardNavIcon} />
          <FormattedMessage id="TopbarMobileMenu.teamDashboardLink" />
        </span>
      </NamedLink>
    </li>
  );

  const customerDashboardLink = (
    <li className={classNames(css.navigationLink, currentPageClass('CustomerDashboardPage'))}>
      <NamedLink name="CustomerDashboardPage">
        <span className={css.dashboardNavInner}>
          <PeakUpHqIcon name="dashboard" className={css.dashboardNavIcon} />
          <FormattedMessage id="TopbarMobileMenu.customerDashboardLink" />
        </span>
      </NamedLink>
    </li>
  );

  const listingsLink = showCreateListingsLink ? (
    <li className={classNames(css.navigationLink, currentPageClass('ManageListingsPage'))}>
      <NamedLink name="ManageListingsPage">
        <FormattedMessage id="TopbarMobileMenu.listingsLink" />
      </NamedLink>
    </li>
  ) : null;

  const createServiceLink = showCreateListingsLink ? (
    <CreateServiceMobileNavItem currentPageClass={currentPageClass} />
  ) : null;

  const calendarLink = (
    <li className={classNames(css.navigationLink, currentPageClass('CoachCalendarPage'))}>
      <NamedLink name="CoachCalendarPage">
        <FormattedMessage id="TopbarMobileMenu.coachCalendarLink" />
      </NamedLink>
    </li>
  );

  const earningsLink = (
    <li className={classNames(css.navigationLink, currentPageClass('CoachEarningsDashboardPage'))}>
      <NamedLink name="CoachEarningsDashboardPage">
        <FormattedMessage id="TopbarMobileMenu.coachEarningsLink" />
      </NamedLink>
    </li>
  );

  const requestsLink = (
    <li className={classNames(css.navigationLink, currentPageClass(`InboxPage:${inboxTab}`))}>
      <NamedLink name="InboxPage" params={{ tab: inboxTab }}>
        <FormattedMessage id="TopbarMobileMenu.requestsLink" />
      </NamedLink>
    </li>
  );

  const profileLink = (
    <li className={classNames(css.navigationLink, currentPageClass('ProfileSettingsPage'))}>
      <NamedLink name="ProfileSettingsPage">
        <FormattedMessage id="TopbarMobileMenu.profileSettingsLink" />
      </NamedLink>
    </li>
  );

  const accountLink = (
    <li className={classNames(css.navigationLink, currentPageClass('AccountSettingsPage'))}>
      <NamedLink name="AccountSettingsPage">
        <FormattedMessage id="TopbarMobileMenu.accountSettingsLink" />
      </NamedLink>
    </li>
  );

  const ambassadorSection = showAmbassadorMenu ? (
    <>
      <li className={css.menuSeparatorAmbassador} role="separator" aria-hidden="true" />
      <li className={css.ambassadorToggleItem}>
        <InlineTextButton
          rootClassName={classNames(
            css.ambassadorToggle,
            ambassadorExpanded ? css.ambassadorToggleOpen : null
          )}
          aria-expanded={ambassadorExpanded}
          onClick={() => setAmbassadorExpanded(expanded => !expanded)}
        >
          <span className={css.ambassadorToggleInner}>
            <FormattedMessage id="TopbarMobileMenu.ambassadorToolsLink" />
            <span className={css.ambassadorChevron} aria-hidden="true" />
          </span>
        </InlineTextButton>
      </li>
      <li className={css.menuSeparatorAmbassador} role="separator" aria-hidden="true" />
      <li
        className={classNames(
          css.navigationLink,
          css.navigationLinkAmbassador,
          css.ambassadorChildLink,
          ambassadorChildClass,
          currentPageClass('AmbassadorProgramPage')
        )}
      >
        <NamedLink name="AmbassadorProgramPage" tabIndex={ambassadorExpanded ? undefined : -1}>
          <FormattedMessage id="TopbarMobileMenu.ambassadorProgramLink" />
        </NamedLink>
      </li>
      <li
        className={classNames(
          css.navigationLink,
          css.navigationLinkAmbassador,
          css.ambassadorChildLink,
          ambassadorChildClass,
          currentPageClass('ReferralCenterPage')
        )}
      >
        <NamedLink name="ReferralCenterPage" tabIndex={ambassadorExpanded ? undefined : -1}>
          <FormattedMessage id="TopbarMobileMenu.referralCenterLink" />
        </NamedLink>
      </li>
    </>
  ) : null;

  const peakUpHqLink = showPeakUpHqLink ? (
    <li
      className={classNames(
        css.navigationLink,
        css.navigationLinkPeakUpHq,
        isPeakUpHqRouteName(currentPage) && css.currentPage
      )}
    >
      <NamedLink name="PeakUpHQPage">
        <span className={css.peakUpHqNavInner}>
          <PeakUpHqIcon name="hq" className={css.peakUpHqNavIcon} />
          <FormattedMessage id="TopbarMobileMenu.peakUpHqLink" />
        </span>
      </NamedLink>
    </li>
  ) : null;

  const modeSeparator = <li className={css.menuSeparatorAmbassador} role="separator" aria-hidden="true" />;

  const exploreAsCustomerLink = (
    <li className={css.modeSwitchItem}>
      <InlineTextButton rootClassName={css.modeSwitchButton} onClick={onExploreAsCustomer}>
        <FormattedMessage id="TopbarMobileMenu.exploreAsCustomerLink" />
      </InlineTextButton>
    </li>
  );

  const returnToCoachLink = (
    <li className={css.modeSwitchItem}>
      <InlineTextButton rootClassName={classNames(css.modeSwitchButton, css.modeSwitchCoach)} onClick={onReturnToCoachMode}>
        <span className={css.dashboardNavInner}>
          <PeakUpHqIcon name="dashboard" className={css.dashboardNavIcon} />
          <FormattedMessage id="TopbarMobileMenu.returnToCoachDashboardLink" />
        </span>
      </InlineTextButton>
    </li>
  );

  let accountLinks = null;

  if (teamNavMode) {
    accountLinks = (
      <>
        {teamDashboardLink}
        {requestsLink}
        {accountLink}
        {peakUpHqLink}
      </>
    );
  } else if (coachNavMode) {
    accountLinks = (
      <>
        {dashboardLink}
        {createServiceLink}
        {listingsLink}
        {calendarLink}
        {earningsLink}
        {requestsLink}
        {ambassadorSection}
        {profileLink}
        {modeSeparator}
        {exploreAsCustomerLink}
        {peakUpHqLink}
      </>
    );
  } else if (canSwitchPlatformMode) {
    accountLinks = (
      <>
        {inboxLink}
        {profileLink}
        {accountLink}
        {modeSeparator}
        {returnToCoachLink}
        {peakUpHqLink}
      </>
    );
  } else if (showCoachCalendarLink) {
    accountLinks = (
      <>
        {inboxLink}
        {dashboardLink}
        {createServiceLink}
        {listingsLink}
        {calendarLink}
        {earningsLink}
        {profileLink}
        {accountLink}
        {ambassadorSection}
        {peakUpHqLink}
      </>
    );
  } else {
    accountLinks = (
      <>
        {customerDashboardLink}
        {inboxLink}
        {profileLink}
        {accountLink}
        {peakUpHqLink}
      </>
    );
  }

  return (
    <div className={css.root}>
      <AvatarLarge className={css.avatar} user={currentUser} />
      <div className={css.content}>
        <span className={css.greeting}>
          <FormattedMessage id="TopbarMobileMenu.greeting" values={{ displayName }} />
        </span>
        <InlineTextButton rootClassName={css.logoutButton} onClick={onLogout}>
          <FormattedMessage id="TopbarMobileMenu.logoutLink" />
        </InlineTextButton>

        <ul className={css.accountLinksWrapper}>{accountLinks}</ul>
        {!coachNavMode && !teamNavMode ? <ul className={css.customLinksWrapper}>{extraLinks}</ul> : null}
        {!customerDiscoveryMenu ? <LanguageSelector variant="mobileMenu" /> : null}
        <div className={css.spacer} />
      </div>
    </div>
  );
};

export default TopbarMobileMenu;
