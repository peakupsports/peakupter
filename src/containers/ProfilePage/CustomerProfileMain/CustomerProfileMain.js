/* Customer profile dashboard — standard div elements only (no Framer Motion). */
import React, { useRef } from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../../util/reactIntl';
import NamedLink from '../../../components/NamedLink/NamedLink';
import Reviews from '../../../components/Reviews/Reviews';
import CustomerProfileHero from '../CustomerProfileHero/CustomerProfileHero';
import css from './CustomerProfileMain.module.css';

const CARD_ICONS = {
  about: 'A',
  languages: 'L',
  sports: 'S',
  reviews: 'R',
  bookings: 'B',
  saved: 'F',
};

const ReviewsErrorMaybe = ({ queryReviewsError }) =>
  queryReviewsError ? (
    <p className={css.emptyText}>
      <FormattedMessage id="ProfilePage.loadingReviewsFailed" />
    </p>
  ) : null;

const DashboardCard = ({ titleId, icon, className, headerExtra, children }) => (
  <article className={classNames(css.card, className)}>
    <header className={css.cardHeader}>
      <h3 className={css.cardTitle}>
        <span className={css.cardTitleIcon} aria-hidden>
          {icon}
        </span>
        <FormattedMessage id={titleId} />
      </h3>
      {headerExtra || null}
    </header>
    {children}
  </article>
);

const SportMiniCards = ({ sports }) => (
  <div className={css.sportGrid}>
    {sports.map(sport => (
      <div key={sport.key} className={css.sportMini} title={sport.label}>
        <span className={css.sportMiniIcon} aria-hidden>
          {sport.emoji}
        </span>
        <span className={css.sportMiniLabel}>{sport.label}</span>
      </div>
    ))}
  </div>
);

/**
 * Customer-only profile dashboard (hero + explicit 2-column row wrappers).
 *
 * Desktop:
 * 1. Hero (full width)
 * 2. About (full width)
 * 3. Favorite sports | Languages
 * 4. Reviews | Recent bookings
 * 5. Favorite coaches (full width)
 */
const CustomerProfileMain = props => {
  const {
    displayName,
    isOwnProfile = false,
    bioWithLinks,
    hasBio,
    favoriteSports = [],
    languages = [],
    hideReviews = false,
    reviewsOfCustomer = [],
    queryReviewsError,
    showBookingsLink = false,
    className,
  } = props;

  const reviewsScrollRef = useRef(null);
  const hasReviews = reviewsOfCustomer.length > 0;

  const scrollReviews = () => {
    reviewsScrollRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  };

  const bookingsCard = (
    <DashboardCard
      titleId="ProfilePage.memberRecentBookingsHeading"
      icon={CARD_ICONS.bookings}
      className={css.cardBookings}
    >
      <div className={css.cardBody}>
        <p className={css.cardHint}>
          <FormattedMessage
            id={
              showBookingsLink
                ? 'ProfilePage.memberRecentBookingsHint'
                : 'ProfilePage.memberRecentBookingsHintPublic'
            }
          />
        </p>
        {showBookingsLink ? (
          <NamedLink name="InboxPage" params={{ tab: 'orders' }} className={css.bookingsLink}>
            <FormattedMessage id="ProfilePage.memberRecentBookingsCta" />
          </NamedLink>
        ) : null}
      </div>
    </DashboardCard>
  );

  return (
    <div className={classNames(css.root, className)}>
      <CustomerProfileHero displayName={displayName} isOwnProfile={isOwnProfile} />

      <div className={css.dashboardStack}>
        <DashboardCard
          titleId="ProfilePage.stickerAboutHeading"
          icon={CARD_ICONS.about}
          className={css.cardAbout}
        >
          {hasBio ? (
            <div className={css.cardBody}>{bioWithLinks}</div>
          ) : (
            <p className={css.emptyText}>
              <FormattedMessage id="ProfilePage.memberBioEmpty" />
            </p>
          )}
        </DashboardCard>

        <div
          className={classNames(
            css.customerDashboardTwoColRow,
            css.customerSportsLanguagesRow
          )}
        >
          <DashboardCard
            titleId="ProfilePage.memberFavoriteSportsHeading"
            icon={CARD_ICONS.sports}
            className={css.cardSports}
          >
            <div className={css.cardBody}>
              {favoriteSports.length > 0 ? (
                <SportMiniCards sports={favoriteSports} />
              ) : (
                <p className={css.emptyText}>
                  <FormattedMessage id="ProfilePage.memberFavoriteSportsEmpty" />
                </p>
              )}
            </div>
          </DashboardCard>

          <DashboardCard
            titleId="ProfilePage.stickerLanguagesHeading"
            icon={CARD_ICONS.languages}
            className={css.cardLanguages}
          >
            <div className={classNames(css.cardBody, css.cardBodyCentered)}>
              {languages.length > 0 ? (
                <div className={css.langRow}>
                  {languages.map(lang => (
                    <span key={lang.key} className={css.langChip}>
                      {lang.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={css.emptyText}>
                  <FormattedMessage id="ProfilePage.memberLanguagesEmpty" />
                </p>
              )}
            </div>
          </DashboardCard>
        </div>

        {hideReviews ? (
          <div className={css.dashboardFullWidth}>{bookingsCard}</div>
        ) : (
          <div className={css.customerDashboardTwoColRow}>
            <article className={classNames(css.card, css.cardReviews)} id="member-reviews">
              <header className={css.cardHeader}>
                <h3 className={css.cardTitle}>
                  <span className={css.cardTitleIcon} aria-hidden>
                    {CARD_ICONS.reviews}
                  </span>
                  <FormattedMessage
                    id="ProfilePage.reviewsAsACustomerTitle"
                    values={{ count: reviewsOfCustomer.length }}
                  />
                </h3>
                {hasReviews ? (
                  <button type="button" className={css.viewAllBtn} onClick={scrollReviews}>
                    <FormattedMessage id="ProfilePage.memberReviewsViewAll" />
                  </button>
                ) : null}
              </header>
              <ReviewsErrorMaybe queryReviewsError={queryReviewsError} />
              <div className={css.reviewsScroll} ref={reviewsScrollRef}>
                {hasReviews ? (
                  <Reviews rootClassName={css.reviewsCompact} reviews={reviewsOfCustomer} />
                ) : (
                  <p className={css.emptyText}>
                    <FormattedMessage id="ProfilePage.memberReviewsEmpty" />
                  </p>
                )}
              </div>
            </article>
            {bookingsCard}
          </div>
        )}

        <DashboardCard
          titleId="ProfilePage.memberSavedCoachesHeading"
          icon={CARD_ICONS.saved}
          className={css.cardSaved}
        >
          <div className={classNames(css.cardBody, css.savedPlaceholder)}>
            <span className={css.savedIcon} aria-hidden />
            <div>
              <p className={css.emptyText}>
                <FormattedMessage id="ProfilePage.memberSavedCoachesHint" />
              </p>
              <p className={css.savedSoon}>
                <FormattedMessage id="ProfilePage.memberSavedCoachesSoon" />
              </p>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};

export default CustomerProfileMain;
