import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../util/reactIntl';
import { REVIEW_TYPE_OF_PROVIDER } from '../../util/types';
import {
  coachStickerShowsVerifiedSeal,
  formatCoachExperienceLabel,
} from '../../util/profileCoachSticker';

import css from './PeakUpProfileTrustTopbar.module.css';

/** Heater shield + check ben centrato (oro via currentColor). */
const IconShieldVerified = () => (
  <svg
    className={css.iconWrap}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 3.25 5 5.4v5.7c0 4.55 2.95 8.05 7 9.65 4.05-1.6 7-5.1 7-9.65V5.4l-7-2.15Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="m8.4 11.5 2.55 2.55 4.65-5.05"
      stroke="currentColor"
      strokeWidth="2.05"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconStar = () => (
  <svg
    className={css.iconWrap}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 3.65 14.45 9.1 20.4 9.85 16 13.95l1.05 5.85L12 17.05 6.95 19.8 8 13.95 3.6 9.85l5.95-.75L12 3.65Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

const IconPeople = () => (
  <svg
    className={css.iconWrap}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="9" cy="9.25" r="2.6" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M3.5 19.05c0-2.55 2.1-4.6 4.7-4.6h1.6c2.6 0 4.7 2.05 4.7 4.6"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <circle cx="16.85" cy="8" r="2.05" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M14.7 14.5h2.45c1.95 0 3.55 1.55 3.55 3.45v.8"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const IconBolt = () => (
  <svg
    className={css.iconWrap}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M13.6 2.6 5.7 13.05h5.05L10.4 21.4 18.3 10.95h-5.05L13.6 2.6Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

/** @param {Object[]} reviews */
const providerReviewStats = reviews => {
  const list = Array.isArray(reviews) ? reviews : [];
  const ratings = list
    .map(r => r?.attributes?.rating)
    .filter(v => typeof v === 'number' && Number.isFinite(v));
  if (!ratings.length) {
    return { count: list.length, avg: null };
  }
  const sum = ratings.reduce((a, b) => a + b, 0);
  return { count: list.length, avg: sum / ratings.length };
};

const Item = ({ icon, title, subtitle }) => (
  <div className={css.item}>
    {icon}
    <div className={css.textBlock}>
      <p className={css.title}>{title}</p>
      <p className={css.subtitle}>{subtitle}</p>
    </div>
  </div>
);

/**
 * Barra trust (verified, experience, reviews, response): icone oro + titolo + sottotitolo.
 *
 * @param {Object} props
 * @param {import('react-intl').intlShape} props.intl
 * @param {Object} props.publicData Profilo `publicData`
 * @param {Object[]} props.reviews Recensioni profilo
 * @param {'topbar'|'rail'} props.variant `topbar` = slot desktop; `rail` = fascia sotto header su mobile/tablet
 */
const PeakUpProfileTrustTopbar = props => {
  const { intl, publicData = {}, reviews = [], variant = 'topbar' } = props;
  const pd = publicData || {};

  const verifiedSeal = coachStickerShowsVerifiedSeal(pd);
  const experienceText = formatCoachExperienceLabel(intl, pd.experience);
  const providerRows = (Array.isArray(reviews) ? reviews : []).filter(
    r => r?.attributes?.type === REVIEW_TYPE_OF_PROVIDER
  );
  const { count: reviewCount, avg: ratingAvg } = providerReviewStats(providerRows);

  const responseHoursRaw = pd.peakupAvgResponseHours;
  const responseHours =
    typeof responseHoursRaw === 'number' && Number.isFinite(responseHoursRaw)
      ? responseHoursRaw
      : typeof responseHoursRaw === 'string' && responseHoursRaw.trim() !== ''
      ? Number(responseHoursRaw)
      : null;
  const responseNote =
    pd.peakupResponseTimeNote != null && String(pd.peakupResponseTimeNote).trim()
      ? String(pd.peakupResponseTimeNote).trim()
      : null;

  const ratingOneDecimal =
    ratingAvg != null ? (Math.round(ratingAvg * 10) / 10).toFixed(1) : null;

  const rootClass = variant === 'rail' ? css.rootRail : css.rootTopbar;

  return (
    <div
      className={classNames(rootClass)}
      role="region"
      aria-label={intl.formatMessage({ id: 'ProfilePage.trustTopbar.regionLabel' })}
    >
      <Item
        icon={<IconShieldVerified />}
        title={
          verifiedSeal ? (
            <FormattedMessage id="ProfilePage.trustTopbar.verifiedTitle" />
          ) : (
            <FormattedMessage id="ProfilePage.trustTopbar.coachTitle" />
          )
        }
        subtitle={
          verifiedSeal ? (
            <FormattedMessage id="ProfilePage.trustTopbar.verifiedSubtitle" />
          ) : (
            <FormattedMessage id="ProfilePage.trustTopbar.coachSubtitle" />
          )
        }
      />
      <Item
        icon={<IconStar />}
        title={<FormattedMessage id="ProfilePage.trustTopbar.experiencedTitle" />}
        subtitle={
          experienceText ? (
            experienceText
          ) : (
            <FormattedMessage id="ProfilePage.trustTopbar.experiencedFallback" />
          )
        }
      />
      <Item
        icon={<IconPeople />}
        title={<FormattedMessage id="ProfilePage.trustTopbar.trustedTitle" />}
        subtitle={
          reviewCount > 0 && ratingOneDecimal != null ? (
            <FormattedMessage
              id="ProfilePage.trustTopbar.trustedSubtitleReviews"
              values={{ count: reviewCount, rating: ratingOneDecimal }}
            />
          ) : reviewCount > 0 ? (
            <FormattedMessage
              id="ProfilePage.trustTopbar.trustedSubtitleCountOnly"
              values={{ count: reviewCount }}
            />
          ) : (
            <FormattedMessage id="ProfilePage.trustTopbar.trustedSubtitleNew" />
          )
        }
      />
      <Item
        icon={<IconBolt />}
        title={<FormattedMessage id="ProfilePage.trustTopbar.fastTitle" />}
        subtitle={
          responseNote ? (
            responseNote
          ) : responseHours != null && Number.isFinite(responseHours) ? (
            <FormattedMessage
              id="ProfilePage.trustTopbar.fastSubtitleHours"
              values={{ hours: Math.round(responseHours) }}
            />
          ) : (
            <FormattedMessage id="ProfilePage.trustTopbar.fastSubtitleDefault" />
          )
        }
      />
    </div>
  );
};

export default PeakUpProfileTrustTopbar;
