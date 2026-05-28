import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import { PROFILE_PAGE_PENDING_APPROVAL_VARIANT } from '../../util/urlHelpers';
import { NamedLink } from '../../components';

import css from './ProfileSettingsPage.module.css';

/**
 * PeakUp premium CTA — opens the user's public profile preview.
 *
 * @param {Object} props
 * @param {string} [props.userUUID]
 * @param {boolean} [props.isUnauthorizedUser]
 * @param {'default'|'compact'} [props.size]
 * @param {string} [props.className]
 * @returns {JSX.Element|null}
 */
const ViewProfileLink = props => {
  const { userUUID, isUnauthorizedUser, size = 'default', className } = props;

  if (!userUUID) {
    return null;
  }

  const classes = classNames(
    css.viewProfileCta,
    size === 'compact' ? css.viewProfileCtaCompact : null,
    className
  );

  if (isUnauthorizedUser) {
    return (
      <NamedLink
        className={classes}
        name="ProfilePageVariant"
        params={{ id: userUUID, variant: PROFILE_PAGE_PENDING_APPROVAL_VARIANT }}
      >
        <FormattedMessage id="ProfileSettingsPage.viewProfileLink" />
      </NamedLink>
    );
  }

  return (
    <NamedLink className={classes} name="ProfilePage" params={{ id: userUUID }}>
      <FormattedMessage id="ProfileSettingsPage.viewProfileLink" />
    </NamedLink>
  );
};

export default ViewProfileLink;
