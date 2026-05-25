import React, { useMemo, useState } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect, useLocation } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import {
  buildCoachSignupAuthSearch,
  coachOnboardingSignupTo,
  parseReferralCodeFromLocation,
} from '../../util/coachOnboarding';
import { resolveCoachApplicationInitialReferralCode } from '../../util/coachApplication';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { fetchCurrentUser } from '../../ducks/user.duck';

import { Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import pageCss from './CoachApplicationPage.module.css';
import formCss from './CoachApplicationForm.module.css';
import CoachApplicationForm from './CoachApplicationForm';

const HERO_IMAGE = '/Multisports.jpg';

/**
 * PeakUp coach application — cinematic multi-step form at /coach-application.
 */
const CoachApplicationSuccess = () => (
  <section
    className={classNames(formCss.card, pageCss.successShell)}
    aria-labelledby="coach-application-success-heading"
  >
    <div className={pageCss.successIconWrap} aria-hidden="true">
      <span className={pageCss.successIconRing} />
      <svg className={pageCss.successIconSvg} viewBox="0 0 88 88" fill="none">
        <circle cx="44" cy="44" r="40" stroke="rgba(25, 223, 242, 0.35)" strokeWidth="2" />
        <path
          className={pageCss.successCheck}
          d="M28 46 L40 58 L60 34"
          stroke="url(#successGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <defs>
          <linearGradient id="successGrad" x1="28" y1="34" x2="60" y2="58">
            <stop offset="0%" stopColor="#9dff4f" />
            <stop offset="50%" stopColor="#22e6b8" />
            <stop offset="100%" stopColor="#17d9ff" />
          </linearGradient>
        </defs>
      </svg>
    </div>
    <h1 id="coach-application-success-heading" className={pageCss.successTitle}>
      <FormattedMessage id="CoachApplicationPage.successHeadline" />
    </h1>
    <p className={pageCss.successLead}>
      <FormattedMessage id="CoachApplicationPage.successBody" />
    </p>
    <ul className={pageCss.successNotes}>
      <li className={pageCss.successNote}>
        <span className={pageCss.successNoteIcon} aria-hidden="true">
          ⏱
        </span>
        <FormattedMessage id="CoachApplicationPage.successTimeline" />
      </li>
      <li className={pageCss.successNote}>
        <span className={pageCss.successNoteIcon} aria-hidden="true">
          ✉
        </span>
        <FormattedMessage id="CoachApplicationPage.successEmailNote" />
      </li>
    </ul>
  </section>
);

const CoachApplicationPage = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const location = useLocation();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUser = useSelector(state => state.user?.currentUser);
  const [submitted, setSubmitted] = useState(false);
  const marketplaceName = config.branding.marketplaceName || 'PeakUp';

  const user = ensureCurrentUser(currentUser);
  const ref = parseReferralCodeFromLocation(location);

  const initialReferralCode = useMemo(
    () => resolveCoachApplicationInitialReferralCode({ location, currentUser: user }),
    [location, user]
  );

  if (!isAuthenticated || !user.id || !user.attributes.emailVerified) {
    return (
      <Redirect
        to={{
          pathname: '/signup',
          search: buildCoachSignupAuthSearch({ ref }),
          ...coachOnboardingSignupTo({ ref }),
        }}
      />
    );
  }

  const title = intl.formatMessage(
    { id: 'CoachApplicationPage.schemaTitle' },
    { marketplaceName }
  );
  const description = intl.formatMessage({ id: 'CoachApplicationPage.schemaDescription' });

  return (
    <Page
      title={title}
      description={description}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, pageCss.page)}
    >
      <TopbarContainer currentPage="CoachApplicationPage" chromeTheme="sportPremium" />

      <main className={pageCss.main}>
        {!submitted ? (
          <section
            id="coach-application-page-top"
            className={pageCss.heroCinematic}
            aria-labelledby="coach-application-hero-heading"
          >
            <div className={pageCss.heroMedia} aria-hidden="true">
              <img className={pageCss.heroImage} src={HERO_IMAGE} alt="" loading="eager" decoding="async" />
              <div className={pageCss.heroOverlay} />
              <div className={pageCss.heroGlow} />
            </div>
            <div className={pageCss.heroContent}>
              <p className={pageCss.heroEyebrow}>
                <FormattedMessage id="CoachApplicationPage.eyebrow" />
              </p>
              <h1 id="coach-application-hero-heading" className={pageCss.heroTitle}>
                <FormattedMessage id="CoachApplicationPage.heroTitle" />
              </h1>
              <p className={pageCss.heroSubheadline}>
                <FormattedMessage id="CoachApplicationPage.heroSubheadline" />
              </p>
            </div>
          </section>
        ) : null}

        <div className={pageCss.rail}>
          {!submitted ? (
            <CoachApplicationForm
              initialReferralCode={initialReferralCode}
              currentUser={user}
              onSuccess={() => {
                setSubmitted(true);
                dispatch(fetchCurrentUser({ enforce: true }));
              }}
            />
          ) : (
            <CoachApplicationSuccess />
          )}
        </div>
      </main>

      <FooterContainer />
    </Page>
  );
};

export default CoachApplicationPage;
