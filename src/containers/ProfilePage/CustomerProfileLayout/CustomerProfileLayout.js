import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../../util/reactIntl';
import { REVIEW_TYPE_OF_CUSTOMER } from '../../../util/types';
import { richText } from '../../../util/richText';
import { resolveCustomerLevelLabel } from '../../../util/customerProfileMember';
import {
  formatProfileLanguagesForSticker,
  formatProfileSportsForSticker,
} from '../../../util/profileCoachSticker';
import { LayoutSideNavigation } from '../../../components';
import PeakUpCustomerCard from '../../../components/PeakUpCustomerCard/PeakUpCustomerCard';
import layoutSideNavCss from '../../../components/LayoutComposer/LayoutSideNavigation/LayoutSideNavigation.module.css';
import TopbarContainer from '../../TopbarContainer/TopbarContainer';
import FooterContainer from '../../FooterContainer/FooterContainer';
import CustomerProfileMain from '../CustomerProfileMain/CustomerProfileMain';
import css from './CustomerProfileLayout.module.css';

const MIN_LENGTH_FOR_LONG_WORDS = 20;

/**
 * PeakUp customer (member) profile — fully separate from coach ProfilePage layout.
 * Coaches continue to use ProfilePage coach figurina + MainContent paths only.
 */
const CustomerProfileLayout = props => {
  const {
    profileUser,
    displayName,
    bio,
    publicData = {},
    reviews = [],
    queryReviewsError,
    hideReviews = false,
    showEditProfileLink = false,
    showBookingsLink = false,
    intl,
  } = props;

  const hasBio = !!bio;
  const bioWithLinks = richText(bio, {
    linkify: true,
    longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
    longWordClass: css.longWord,
  });
  const favoriteSports = formatProfileSportsForSticker(intl, publicData.sports);
  const languages = formatProfileLanguagesForSticker(intl, publicData.languages);
  const levelLabel = resolveCustomerLevelLabel(intl, publicData) || null;
  const reviewsOfCustomer = reviews.filter(r => r.attributes?.type === REVIEW_TYPE_OF_CUSTOMER);

  return (
    <LayoutSideNavigation
      className={css.customerProfilePageShell}
      containerClassName={classNames(
        layoutSideNavCss.container,
        css.customerProfileLayoutDesktop
      )}
      sideNavClassName={css.asideCustomerProfile}
      mainColumnClassName={css.mainCustomerProfile}
      topbar={<TopbarContainer />}
      sideNav={
        <>
          {displayName ? (
            <h1 className={css.srOnly}>
              <FormattedMessage id="ProfilePage.mobileHeading" values={{ name: displayName }} />
            </h1>
          ) : null}
          <PeakUpCustomerCard
            user={profileUser}
            displayName={displayName}
            favoriteSports={favoriteSports}
            languages={languages}
            levelLabel={levelLabel}
            showEditProfileLink={showEditProfileLink}
          />
        </>
      }
      footer={<FooterContainer />}
    >
      <CustomerProfileMain
        displayName={displayName}
        isOwnProfile={showEditProfileLink}
        bioWithLinks={bioWithLinks}
        hasBio={hasBio}
        favoriteSports={favoriteSports}
        languages={languages}
        hideReviews={hideReviews}
        reviewsOfCustomer={reviewsOfCustomer}
        queryReviewsError={queryReviewsError}
        showBookingsLink={showBookingsLink}
      />
    </LayoutSideNavigation>
  );
};

export default CustomerProfileLayout;
