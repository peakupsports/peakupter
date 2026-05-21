import React from 'react';
import classNames from 'classnames';

import { FieldSelect, H6 } from '../../../components';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { required } from '../../../util/validators';
import {
  peakupMeetingPointFromFormValues,
  peakupMeetingPointForProtectedData,
  logPeakupMeetingPointSelected,
} from '../../../util/peakupMeetingPoint';

import css from './MeetingPointSelectMaybe.module.css';

/**
 * Coach preferred meeting point picker on booking forms.
 *
 * @param {Object} props
 * @param {Array<Object>} props.preferredMeetingPoints Normalized coach points
 * @param {string} [props.formId]
 * @param {string} [props.className]
 * @param {boolean} [props.skip] Already chosen in pre-booking modal
 */
const MeetingPointSelectMaybe = props => {
  const { preferredMeetingPoints = [], formId, className, skip = false } = props;
  const intl = useIntl();

  if (skip || !preferredMeetingPoints.length) {
    return null;
  }

  const requiredMessage = intl.formatMessage({
    id: 'MeetingPointSelectMaybe.required',
  });
  const validateMaybe =
    preferredMeetingPoints.length > 1
      ? { validate: required(requiredMessage) }
      : {};

  const id = formId ? `${formId}.peakupMeetingPointId` : 'peakupMeetingPointId';

  return (
    <div className={classNames(css.root, className)}>
      <H6 as="h3" className={css.heading}>
        <FormattedMessage id="MeetingPointSelectMaybe.heading" />
      </H6>
      <FieldSelect
        id={id}
        name="peakupMeetingPointId"
        className={css.select}
        label={intl.formatMessage({ id: 'MeetingPointSelectMaybe.label' })}
        {...validateMaybe}
        onChange={selectedId => {
          const point = peakupMeetingPointFromFormValues(
            { peakupMeetingPointId: selectedId },
            preferredMeetingPoints
          );
          const stored = peakupMeetingPointForProtectedData(point);
          if (stored) {
            logPeakupMeetingPointSelected(stored);
          }
        }}
      >
        {preferredMeetingPoints.length > 1 ? (
          <option disabled value="">
            {intl.formatMessage({ id: 'MeetingPointSelectMaybe.placeholder' })}
          </option>
        ) : null}
        {preferredMeetingPoints.map(point => (
          <option key={point.id} value={point.id}>
            {point.label}
            {point.address ? ` — ${point.address}` : ''}
          </option>
        ))}
      </FieldSelect>
    </div>
  );
};

export default MeetingPointSelectMaybe;
