import React from 'react';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import {
  getPreBookingParticipantTypeOptions,
  getPreBookingSkillLevelOptions,
} from '../../util/peakupPreBooking';

import css from './OrderBreakdown.module.css';

/**
 * Session intake details collected before availability selection (sport, level, participants).
 *
 * @param {{ peakupPreBooking?: Object|null }} props
 */
const LineItemPeakUpPreBookingMaybe = ({ peakupPreBooking }) => {
  const intl = useIntl();
  if (!peakupPreBooking || typeof peakupPreBooking !== 'object') {
    return null;
  }

  const {
    sportLabel,
    sport,
    participantType,
    skillLevel,
    sessionLanguage,
    sessionLanguageLabel,
    participantCount,
  } = peakupPreBooking;
  if (!sport && !participantType && !skillLevel && participantCount == null) {
    return null;
  }

  const participantOptions = getPreBookingParticipantTypeOptions(intl);
  const skillOptions = getPreBookingSkillLevelOptions(intl);
  const participantLabel =
    participantOptions.find(o => o.value === participantType)?.label || participantType;
  const skillLabel = skillOptions.find(o => o.value === skillLevel)?.label || skillLevel;

  const rows = [
    sportLabel || sport
      ? {
          label: intl.formatMessage({
            id: 'OrderBreakdown.peakupPreBookingSport',
            defaultMessage: 'Sport',
          }),
          value: sportLabel || sport,
        }
      : null,
    participantLabel
      ? {
          label: intl.formatMessage({
            id: 'OrderBreakdown.peakupPreBookingParticipantType',
            defaultMessage: 'Participant type',
          }),
          value: participantLabel,
        }
      : null,
    skillLabel
      ? {
          label: intl.formatMessage({
            id: 'OrderBreakdown.peakupPreBookingSkillLevel',
            defaultMessage: 'Skill level',
          }),
          value: skillLabel,
        }
      : null,
    sessionLanguageLabel || sessionLanguage
      ? {
          label: intl.formatMessage({
            id: 'OrderBreakdown.peakupPreBookingSessionLanguage',
            defaultMessage: 'Preferred session language',
          }),
          value: sessionLanguageLabel || sessionLanguage,
        }
      : null,
    Number.isInteger(participantCount)
      ? {
          label: intl.formatMessage({
            id: 'OrderBreakdown.peakupPreBookingParticipantCount',
            defaultMessage: 'Participants',
          }),
          value: String(participantCount),
        }
      : null,
  ].filter(Boolean);

  if (!rows.length) {
    return null;
  }

  return (
    <div className={css.peakupPreBookingWrap}>
      <div className={css.peakupPreBookingHeading}>
        <FormattedMessage
          id="OrderBreakdown.peakupPreBookingTitle"
          defaultMessage="Session details"
        />
      </div>
      <dl className={css.peakupPreBookingList}>
        {rows.map(row => (
          <div key={row.label} className={css.peakupPreBookingRow}>
            <dt className={css.peakupPreBookingLabel}>{row.label}</dt>
            <dd className={css.peakupPreBookingValue}>{row.value}</dd>
          </div>
        ))}
      </dl>
      <hr className={css.totalDivider} />
    </div>
  );
};

export default LineItemPeakUpPreBookingMaybe;
