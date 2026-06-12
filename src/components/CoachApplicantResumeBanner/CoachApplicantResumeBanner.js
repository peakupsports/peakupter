import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import {
  buildCoachApplicationPath,
  getProfileAmbassadorRef,
  shouldRedirectToCoachApplication,
} from '../../util/coachOnboarding';

import NamedLink from '../NamedLink/NamedLink';

import css from './CoachApplicantResumeBanner.module.css';

/**
 * Sticky reminder for coach applicants who still need to complete /coach-application.
 */
const CoachApplicantResumeBanner = props => {
  const { currentUser, isAuthenticated, className, rootClassName } = props;
  const user = ensureCurrentUser(currentUser);

  if (!isAuthenticated || !user.id || !shouldRedirectToCoachApplication(user)) {
    return null;
  }

  const applicationPath = buildCoachApplicationPath({ ref: getProfileAmbassadorRef(user) });

  return (
    <div className={classNames(rootClassName || css.root, className)} role="status">
      <p className={css.text}>
        <FormattedMessage
          id="CoachApplicantResumeBanner.message"
          defaultMessage="Your coach application is not finished yet."
        />
      </p>
      <NamedLink className={css.cta} name="CoachApplicationPage" to={applicationPath}>
        <FormattedMessage
          id="CoachApplicantResumeBanner.cta"
          defaultMessage="Continue application"
        />
      </NamedLink>
    </div>
  );
};

export default CoachApplicantResumeBanner;
