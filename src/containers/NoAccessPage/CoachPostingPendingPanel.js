import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import {
  buildCoachApplicationPath,
  getProfileAmbassadorRef,
  shouldRedirectToCoachApplication,
} from '../../util/coachOnboarding';

import { Logo, NamedLink } from '../../components';

import css from './CoachPostingPendingPanel.module.css';

const MULTISPORTS_IMAGE = '/Multisports.jpg';

/**
 * PeakUp-branded guidance when a coach lacks marketplace posting rights.
 */
const CoachPostingPendingPanel = props => {
  const { currentUser, className, rootClassName } = props;
  const user = ensureCurrentUser(currentUser);
  const showApplicationCta = shouldRedirectToCoachApplication(user);
  const applicationPath = buildCoachApplicationPath({ ref: getProfileAmbassadorRef(user) });

  return (
    <section
      className={classNames(rootClassName || css.root, className)}
      aria-labelledby="coach-posting-pending-heading"
    >
      <div className={css.heroImageWrap} aria-hidden>
        <img className={css.heroImage} src={MULTISPORTS_IMAGE} alt="" />
        <div className={css.heroOverlay} />
      </div>

      <div className={css.glowTop} aria-hidden />
      <div className={css.glowBottom} aria-hidden />

      <div className={css.card}>
        <div className={css.logoWrap} aria-hidden>
          <Logo className={css.logo} layout="desktop" />
        </div>

        <h1 id="coach-posting-pending-heading" className={css.title}>
          <FormattedMessage
            id="NoAccessPage.coachPostingPending.heading"
            defaultMessage="Publishing not available yet"
          />
        </h1>

        <p className={css.lead}>
          <FormattedMessage
            id="NoAccessPage.coachPostingPending.content"
            defaultMessage="Only approved and verified professionals can publish activities and lessons on PeakUp. Your profile must be reviewed by the PeakUp Sports team before you can go live."
          />
        </p>

        <div className={css.actions}>
          <NamedLink className={css.primaryCta} name="CoachDashboardPage">
            <FormattedMessage
              id="NoAccessPage.coachPostingPending.dashboardCta"
              defaultMessage="Go to Coach Dashboard"
            />
          </NamedLink>

          {showApplicationCta ? (
            <NamedLink
              className={css.secondaryCta}
              name="CoachApplicationPage"
              to={applicationPath}
            >
              <FormattedMessage
                id="NoAccessPage.coachPostingPending.primaryCta"
                defaultMessage="Continue coach registration"
              />
            </NamedLink>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default CoachPostingPendingPanel;
