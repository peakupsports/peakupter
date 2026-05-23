import React from 'react';
import { useSelector } from 'react-redux';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import classNames from 'classnames';
import { ACCOUNT_SETTINGS_PAGES } from '../../routing/routeConfiguration';
import { useConfiguration } from '../../context/configurationContext';
import { isPeakUpHqAdmin, isPeakUpHqRouteName } from '../../util/peakupAdmin';
import { LinkTabNavHorizontal } from '../../components';

import css from './UserNav.module.css';

/**
 * A component that renders a navigation bar for a user-specific pages.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} props.currentPage - The current page (e.g. 'ManageListingsPage')
 * @param {boolean} [props.showManageListingsLink] - Whether to show manage listings tab
 * @param {boolean} [props.showCoachCalendarLink] - Whether to show the coach calendar navigation tab
 * @returns {JSX.Element} User navigation component
 */
const UserNav = props => {
  const {
    className,
    rootClassName,
    currentPage,
    showManageListingsLink,
    showCoachCalendarLink,
  } = props;
  const intl = useIntl();
  const config = useConfiguration();
  const currentUser = useSelector(state => state.user.currentUser);
  const showPeakUpHqLink = isPeakUpHqAdmin(currentUser, config);
  const classes = classNames(rootClassName || css.root, className);

  const manageListingsTabMaybe = showManageListingsLink
    ? [
        {
          text: <FormattedMessage id="UserNav.yourListings" />,
          selected: currentPage === 'ManageListingsPage',
          linkProps: {
            name: 'ManageListingsPage',
          },
        },
      ]
    : [];

  const coachCalendarTabMaybe = showCoachCalendarLink
    ? [
        {
          text: <FormattedMessage id="UserNav.coachCalendar" />,
          selected: currentPage === 'CoachCalendarPage',
          disabled: false,
          linkProps: {
            name: 'CoachCalendarPage',
          },
        },
      ]
    : [];

  const peakUpHqTabMaybe = showPeakUpHqLink
    ? [
        {
          text: (
            <span className={css.peakUpHqTabLabel}>
              <FormattedMessage id="UserNav.peakUpHq" />
            </span>
          ),
          selected: isPeakUpHqRouteName(currentPage),
          linkProps: {
            name: 'PeakUpHQPage',
          },
          className: css.peakUpHqTab,
        },
      ]
    : [];

  const tabs = [
    ...manageListingsTabMaybe,
    ...coachCalendarTabMaybe,
    {
      text: <FormattedMessage id="UserNav.profileSettings" />,
      selected: currentPage === 'ProfileSettingsPage',
      disabled: false,
      linkProps: {
        name: 'ProfileSettingsPage',
      },
    },
    {
      text: <FormattedMessage id="UserNav.accountSettings" />,
      selected: ACCOUNT_SETTINGS_PAGES.includes(currentPage),
      disabled: false,
      linkProps: {
        name: 'ContactDetailsPage',
      },
    },
    ...peakUpHqTabMaybe,
  ];

  return (
    <LinkTabNavHorizontal
      className={classes}
      tabRootClassName={css.tab}
      tabs={tabs}
      skin="dark"
      ariaLabel={intl.formatMessage({ id: 'UserNav.screenreader.userNav' })}
    />
  );
};

export default UserNav;
