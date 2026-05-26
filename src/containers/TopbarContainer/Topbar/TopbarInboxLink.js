import React, { useEffect } from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink, NotificationBadge } from '../../../components';

import css from './TopbarInboxLink.module.css';

/**
 * Topbar Inbox link with unread / booking-request notification indicator.
 *
 * @param {Object} props
 * @param {number} props.saleNotificationCount
 * @param {number} props.orderNotificationCount
 * @param {string} props.inboxTab
 * @param {boolean} [props.coachNavMode]
 * @param {string} [props.currentPage]
 * @param {'desktop'|'mobile'} [props.variant]
 * @param {string} [props.className]
 * @param {string} [props.labelClassName]
 * @param {string} [props.id]
 */
const TopbarInboxLink = props => {
  const {
    saleNotificationCount = 0,
    orderNotificationCount = 0,
    inboxTab,
    coachNavMode = false,
    currentPage,
    variant = 'desktop',
    className,
    labelClassName,
    id = 'inbox-link',
  } = props;

  const saleCount = saleNotificationCount;
  const orderCount = orderNotificationCount;
  const totalCount = saleCount + orderCount;
  const notificationCount = coachNavMode ? saleCount : totalCount;
  const hasNotifications = notificationCount > 0;
  const isInboxCurrent = currentPage?.indexOf('InboxPage') === 0;
  const badgeCount = notificationCount > 99 ? '99+' : notificationCount;
  const renderedBadgeCount = hasNotifications ? badgeCount : 0;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    // eslint-disable-next-line no-console
    console.log('[PeakUp TOPBAR DOT STATE]', {
      source: 'TopbarInboxLink',
      coachNavMode,
      saleCount,
      orderCount,
      totalCount,
      renderedBadgeCount,
    });
  }, [coachNavMode, saleCount, orderCount, totalCount, renderedBadgeCount]);

  const isDesktop = variant === 'desktop';
  const modeLinkClass = isDesktop
    ? coachNavMode
      ? css.inboxLinkCoachMode
      : css.inboxLinkCustomerMode
    : coachNavMode
    ? css.inboxLinkCoachModeMobile
    : css.inboxLinkCustomerModeMobile;

  const linkClass = classNames(
    isDesktop ? className || css.desktopLink : css.mobileLink,
    modeLinkClass,
    hasNotifications ? css.hasNotifications : null,
    isInboxCurrent ? css.currentPage : null
  );

  const labelClass = classNames(
    css.label,
    isDesktop && !coachNavMode && labelClassName,
    coachNavMode ? css.labelCoachMode : css.labelCustomerMode
  );

  const notificationIndicator = hasNotifications ? (
    <NotificationBadge className={css.notificationBadge} count={badgeCount} />
  ) : null;

  return (
    <NamedLink
      id={id}
      className={linkClass}
      name="InboxPage"
      params={{ tab: inboxTab }}
    >
      <span className={labelClass}>
        <FormattedMessage id="TopbarDesktop.inbox" />
        {notificationIndicator}
      </span>
    </NamedLink>
  );
};

export default TopbarInboxLink;
