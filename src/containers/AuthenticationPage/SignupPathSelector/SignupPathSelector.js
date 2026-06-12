import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import {
  getSignupPathOptions,
  SIGNUP_PATH_CLIENT,
  SIGNUP_PATH_COACH,
  SIGNUP_PATH_TEAM,
} from '../../../util/signupPaths';

import NamedLink from '../../../components/NamedLink/NamedLink';

import SignupPathIcon from './SignupPathIcons';
import css from './SignupPathSelector.module.css';

/**
 * Premium 3-path onboarding selector (client / coach / team).
 * Client & team set Final Form `userType`; coach navigates to coach-signup entry.
 *
 * @param {Object} props
 * @param {(path: 'client'|'coach'|'team', userType?: string) => void} props.onSelectSignupPath
 * @param {'client'|'coach'|'team'|null} [props.activeSignupPath]
 */
const SignupPathSelector = props => {
  const {
    rootClassName,
    splitLayout,
    activeSignupPath,
    onSelectSignupPath,
    userTypes,
    coachSignupTo,
  } = props;
  const { customerUserType, teamUserType, showCoachPath } = getSignupPathOptions(userTypes);

  const isCoachSelected = activeSignupPath === SIGNUP_PATH_COACH;
  const isClientSelected = activeSignupPath === SIGNUP_PATH_CLIENT;
  const isTeamSelected = activeSignupPath === SIGNUP_PATH_TEAM;

  const handleClientSelect = () => {
    if (customerUserType && typeof onSelectSignupPath === 'function') {
      onSelectSignupPath(SIGNUP_PATH_CLIENT, customerUserType);
    }
  };

  const handleTeamSelect = () => {
    if (teamUserType && typeof onSelectSignupPath === 'function') {
      onSelectSignupPath(SIGNUP_PATH_TEAM, teamUserType);
    }
  };

  const handleCoachSelect = () => {
    if (typeof onSelectSignupPath === 'function') {
      onSelectSignupPath(SIGNUP_PATH_COACH);
    }
  };

  return (
    <div
      className={classNames(css.root, splitLayout && css.rootSplitLayout, rootClassName)}
    >
      <header className={css.header}>
        <h2 className={css.title}>
          <FormattedMessage id="AuthenticationPage.signupPathTitle" />
        </h2>
        <p className={css.subtitle}>
          <FormattedMessage id="AuthenticationPage.signupPathSubtitle" />
        </p>
      </header>

      <div
        className={css.grid}
        role="radiogroup"
        aria-label="PeakUp account type"
      >
        {customerUserType ? (
          <button
            type="button"
            role="radio"
            aria-checked={isClientSelected}
            className={classNames(css.card, css.cardClient, {
              [css.cardSelected]: isClientSelected,
            })}
            onClick={handleClientSelect}
          >
            <span className={css.cardIcon} aria-hidden>
              <SignupPathIcon variant="client" className={css.cardIconSvg} />
            </span>
            <span className={css.cardBody}>
              <span className={css.cardTitle}>
                <FormattedMessage id="AuthenticationPage.signupPathClient" />
              </span>
              <span className={css.cardHint}>
                <FormattedMessage id="AuthenticationPage.signupPathClientHint" />
              </span>
            </span>
          </button>
        ) : null}

        {showCoachPath ? (
          <NamedLink
            className={classNames(css.card, css.cardCoach, css.cardLink, {
              [css.cardSelected]: isCoachSelected,
            })}
            name="CoachSignupPage"
            to={coachSignupTo || {}}
            onClick={handleCoachSelect}
          >
            <span className={css.cardIcon} aria-hidden>
              <SignupPathIcon variant="coach" className={css.cardIconSvg} />
            </span>
            <span className={css.cardBody}>
              <span className={css.cardTitle}>
                <FormattedMessage id="AuthenticationPage.signupPathCoach" />
              </span>
              <span className={css.cardHint}>
                <FormattedMessage id="AuthenticationPage.signupPathCoachHint" />
              </span>
            </span>
          </NamedLink>
        ) : null}

        {teamUserType ? (
          <button
            type="button"
            role="radio"
            aria-checked={isTeamSelected}
            className={classNames(css.card, css.cardTeam, {
              [css.cardSelected]: isTeamSelected,
            })}
            onClick={handleTeamSelect}
          >
            <span className={css.cardIcon} aria-hidden>
              <SignupPathIcon variant="team" className={css.cardIconSvg} />
            </span>
            <span className={css.cardBody}>
              <span className={css.cardTitle}>
                <FormattedMessage id="AuthenticationPage.signupPathTeam" />
              </span>
              <span className={css.cardHint}>
                <FormattedMessage id="AuthenticationPage.signupPathTeamHint" />
              </span>
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default SignupPathSelector;
