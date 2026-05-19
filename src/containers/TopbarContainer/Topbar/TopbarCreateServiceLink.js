import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { IconAdd, NamedLink } from '../../../components';

import desktopCss from './TopbarDesktop/TopbarDesktop.module.css';
import mobileCss from './TopbarMobileMenu/TopbarMobileMenu.module.css';

/**
 * "Create service" entry for the desktop avatar dropdown (providers/coaches only).
 *
 * @param {Object} props
 * @param {Function} props.currentPageClass
 * @returns {JSX.Element|null}
 */
export const CreateServiceProfileMenuItem = ({ currentPageClass }) => (
  <NamedLink
    className={classNames(
      desktopCss.menuLink,
      desktopCss.menuLinkWithIcon,
      currentPageClass('NewListingPage')
    )}
    name="NewListingPage"
  >
    <span className={desktopCss.menuItemBorder} />
    <IconAdd className={desktopCss.menuLinkIcon} />
    <span className={desktopCss.menuLinkText}>
      <FormattedMessage id="TopbarDesktop.createListing" />
    </span>
  </NamedLink>
);

/**
 * "Create service" row for the mobile hamburger user menu (providers/coaches only).
 *
 * @param {Object} props
 * @param {Function} props.currentPageClass
 * @returns {JSX.Element}
 */
export const CreateServiceMobileNavItem = ({ currentPageClass }) => (
  <li
    className={classNames(
      mobileCss.navigationLink,
      mobileCss.createServiceNavLink,
      currentPageClass('NewListingPage')
    )}
  >
    <NamedLink name="NewListingPage">
      <span className={mobileCss.menuItemBorder} />
      <span className={mobileCss.createServiceNavInner}>
        <IconAdd className={mobileCss.createServiceNavIcon} />
        <FormattedMessage id="TopbarMobileMenu.newListingLink" />
      </span>
    </NamedLink>
  </li>
);
