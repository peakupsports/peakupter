import React, { useCallback } from 'react';
import { Form as FinalForm } from 'react-final-form';
import { useDispatch } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { manageDisableScrolling } from '../../ducks/ui.duck';
import {
  getPreBookingParticipantCountOptions,
  getPreBookingParticipantTypeOptions,
  getPreBookingSkillLevelOptions,
  normalizePeakupPreBookingDetails,
} from '../../util/peakupPreBooking';
import {
  logPeakupMeetingPointSelected,
  peakupMeetingPointForProtectedData,
  peakupMeetingPointFromFormValues,
  peakupMeetingPointInitialValues,
} from '../../util/peakupMeetingPoint';

import { PrimaryButton, SecondaryButton } from '../Button/Button';
import FieldSelect from '../FieldSelect/FieldSelect';
import Modal from '../Modal/Modal';
import ValidationError from '../ValidationError/ValidationError';

import css from './PreBookingIntroModal.module.css';

const required = value => (value ? undefined : 'required');

/**
 * Pre-booking intake modal — sport, participant type, skill level, headcount.
 * Shown before the availability calendar / checkout on public booking listings.
 *
 * @param {Object} props
 * @param {string} props.id Unique id for scroll-lock (e.g. per listing)
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose Called for dismiss / “Maybe later”
 * @param {Function} props.onContinue Receives `{ peakupPreBooking, peakupMeetingPoint? }`
 * @param {Array<{ value: string, label: string }>} props.sportOptions
 * @param {Array<Object>} [props.preferredMeetingPoints] Coach saved meeting points
 */
const PreBookingIntroModal = ({
  id,
  isOpen,
  onClose,
  onContinue,
  sportOptions = [],
  preferredMeetingPoints = [],
}) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const onManageDisableScrolling = useCallback(
    (componentId, disableScrolling) => {
      dispatch(manageDisableScrolling(componentId, disableScrolling));
    },
    [dispatch]
  );

  const participantTypeOptions = getPreBookingParticipantTypeOptions(intl);
  const skillLevelOptions = getPreBookingSkillLevelOptions(intl);
  const participantCountOptions = getPreBookingParticipantCountOptions(12);

  const hasMeetingPoints = preferredMeetingPoints.length > 0;
  const meetingPointRequired =
    hasMeetingPoints && preferredMeetingPoints.length > 1 ? required : undefined;

  const initialValues = {
    sport: sportOptions.length === 1 ? sportOptions[0].value : '',
    participantType: '',
    skillLevel: '',
    participantCount: '1',
    ...peakupMeetingPointInitialValues(preferredMeetingPoints),
  };

  return (
    <Modal
      id={id}
      className={css.modal}
      scrollLayerClassName={css.scrollLayer}
      containerClassName={css.container}
      contentClassName={css.content}
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal={process.env.NODE_ENV !== 'test'}
      lightCloseButton
      closeOnOutsideClick
    >
      <FinalForm
        initialValues={initialValues}
        onSubmit={values => {
          const normalized = normalizePeakupPreBookingDetails(values, sportOptions);
          if (!normalized) {
            return;
          }
          let peakupMeetingPoint = null;
          if (hasMeetingPoints) {
            const selected = peakupMeetingPointFromFormValues(values, preferredMeetingPoints);
            peakupMeetingPoint = peakupMeetingPointForProtectedData(selected);
            if (preferredMeetingPoints.length > 1 && !peakupMeetingPoint) {
              return;
            }
            if (peakupMeetingPoint) {
              logPeakupMeetingPointSelected(peakupMeetingPoint);
            }
          }
          onContinue({
            peakupPreBooking: normalized,
            ...(peakupMeetingPoint ? { peakupMeetingPoint } : {}),
          });
        }}
        render={({ handleSubmit, submitError, invalid, pristine }) => (
          <form className={css.shell} onSubmit={handleSubmit}>
            <p className={css.eyebrow}>
              <FormattedMessage id="PreBookingIntroModal.eyebrow" defaultMessage="PeakUp Sports" />
            </p>
            <h2 className={css.title}>
              <FormattedMessage
                id="PreBookingIntroModal.title"
                defaultMessage="Tell your coach about your session"
              />
            </h2>
            <p className={css.subtitle}>
              <FormattedMessage
                id="PreBookingIntroModal.subtitle"
                defaultMessage="A few details help your coach prepare. You'll pick dates and times on the next step."
              />
            </p>

            <div className={css.fields}>
              <FieldSelect
                id={`${id}.sport`}
                name="sport"
                className={css.field}
                label={intl.formatMessage({
                  id: 'PreBookingIntroModal.sportLabel',
                  defaultMessage: 'Sport',
                })}
                validate={required}
              >
                <option value="">
                  {intl.formatMessage({
                    id: 'PreBookingIntroModal.sportPlaceholder',
                    defaultMessage: 'Select a sport',
                  })}
                </option>
                {sportOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </FieldSelect>

              <FieldSelect
                id={`${id}.participantType`}
                name="participantType"
                className={css.field}
                label={intl.formatMessage({
                  id: 'PreBookingIntroModal.participantTypeLabel',
                  defaultMessage: 'Participant type',
                })}
                validate={required}
              >
                <option value="">
                  {intl.formatMessage({
                    id: 'PreBookingIntroModal.participantTypePlaceholder',
                    defaultMessage: 'Who is this session for?',
                  })}
                </option>
                {participantTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </FieldSelect>

              <FieldSelect
                id={`${id}.skillLevel`}
                name="skillLevel"
                className={css.field}
                label={intl.formatMessage({
                  id: 'PreBookingIntroModal.skillLevelLabel',
                  defaultMessage: 'Skill level',
                })}
                validate={required}
              >
                <option value="">
                  {intl.formatMessage({
                    id: 'PreBookingIntroModal.skillLevelPlaceholder',
                    defaultMessage: 'Select skill level',
                  })}
                </option>
                {skillLevelOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </FieldSelect>

              <FieldSelect
                id={`${id}.participantCount`}
                name="participantCount"
                className={css.field}
                label={intl.formatMessage({
                  id: 'PreBookingIntroModal.participantCountLabel',
                  defaultMessage: 'Number of participants',
                })}
                validate={required}
              >
                {participantCountOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </FieldSelect>

              {hasMeetingPoints ? (
                <FieldSelect
                  id={`${id}.peakupMeetingPointId`}
                  name="peakupMeetingPointId"
                  className={css.field}
                  label={intl.formatMessage({
                    id: 'PreBookingIntroModal.meetingPointLabel',
                    defaultMessage: 'Meeting point',
                  })}
                  validate={meetingPointRequired}
                >
                  {preferredMeetingPoints.length > 1 ? (
                    <option value="">
                      {intl.formatMessage({
                        id: 'PreBookingIntroModal.meetingPointPlaceholder',
                        defaultMessage: 'Select meeting point',
                      })}
                    </option>
                  ) : null}
                  {preferredMeetingPoints.map(point => (
                    <option key={point.id} value={point.id}>
                      {point.label}
                    </option>
                  ))}
                </FieldSelect>
              ) : null}
            </div>

            {submitError ? (
              <ValidationError className={css.submitError}>{submitError}</ValidationError>
            ) : null}

            <p className={css.footerNote}>
              <FormattedMessage
                id="PreBookingIntroModal.footerNote"
                defaultMessage="Most coaches reply within a few hours."
              />
            </p>

            <div className={css.actions}>
              <PrimaryButton
                className={css.primaryButton}
                type="submit"
                disabled={invalid && pristine}
              >
                <FormattedMessage
                  id="PreBookingIntroModal.continue"
                  defaultMessage="Continue to availability"
                />
              </PrimaryButton>
              <SecondaryButton className={css.secondaryButton} type="button" onClick={onClose}>
                <FormattedMessage id="PreBookingIntroModal.later" defaultMessage="Maybe later" />
              </SecondaryButton>
            </div>
          </form>
        )}
      />
    </Modal>
  );
};

export default PreBookingIntroModal;
