import React, { useMemo } from 'react';
import classNames from 'classnames';
import { useFormState } from 'react-final-form';

import { FormattedMessage } from '../../../util/reactIntl';
import { PEAKUP_SPORT_ENUM_OPTIONS } from '../../../config/configPeakUpCoachUserFields';
import { normalizeSportKey } from '../../../util/coachExplore';

import css from './ProfileSettingsForm.module.css';

const sportLabelForKey = rawKey => {
  const key = normalizeSportKey(String(rawKey || '').trim());
  if (!key) {
    return null;
  }
  const match = PEAKUP_SPORT_ENUM_OPTIONS.find(o => normalizeSportKey(o.option) === key);
  return match?.label || key;
};

/**
 * Highlights primary and secondary team sports above the multi-sport selector.
 */
const TeamSportsOfferedSummary = () => {
  const { values } = useFormState({ subscription: { values: true } });
  const primary = useMemo(
    () => sportLabelForKey(values?.pub_teamPrimarySport),
    [values?.pub_teamPrimarySport]
  );
  const secondary = useMemo(
    () => sportLabelForKey(values?.pub_teamSecondarySport),
    [values?.pub_teamSecondarySport]
  );

  if (!primary && !secondary) {
    return (
      <p className={css.teamSportsOfferedEmpty}>
        <FormattedMessage id="ProfileSettingsForm.teamSportsOfferedEmpty" />
      </p>
    );
  }

  return (
    <div className={css.teamSportsOfferedPanel} aria-label="Team sport highlights">
      {primary ? (
        <div className={css.teamSportHighlightCard}>
          <span className={css.teamSportHighlightBadge}>
            <FormattedMessage id="ProfileSettingsForm.teamSportsPrimaryBadge" />
          </span>
          <span className={css.teamSportHighlightLabel}>{primary}</span>
        </div>
      ) : null}
      {secondary ? (
        <div className={classNames(css.teamSportHighlightCard, css.teamSportHighlightSecondary)}>
          <span className={css.teamSportHighlightBadge}>
            <FormattedMessage id="ProfileSettingsForm.teamSportsSecondaryBadge" />
          </span>
          <span className={css.teamSportHighlightLabel}>{secondary}</span>
        </div>
      ) : null}
    </div>
  );
};

export default TeamSportsOfferedSummary;
