import React from 'react';
import classNames from 'classnames';

import { AvatarMedium } from '../../components';

import css from './CheckoutPage.module.css';

/**
 * Mobile coach avatar strip (hero image is full-page background on PeakUp checkout).
 */
const MobileListingImage = props => {
  const { author } = props;

  if (!author) {
    return null;
  }

  return (
    <div className={classNames(css.mobileCoachStrip, css.avatarMobile)}>
      <div className={css.summaryAvatarFloat}>
        <AvatarMedium user={author} disableProfileLink />
      </div>
    </div>
  );
};

export default MobileListingImage;
