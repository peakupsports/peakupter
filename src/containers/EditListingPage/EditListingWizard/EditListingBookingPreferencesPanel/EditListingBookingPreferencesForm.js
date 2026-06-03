import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import {
  PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT,
  PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_12H,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_24H,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_2H,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_30M,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_48H,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_72H,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_7D,
} from '../../../../util/peakUpBookingPreferences';

// Import shared components
import { Button, Form, FieldRadioButton, FieldSelect, H5 } from '../../../../components';

// Import modules from this directory
import css from './EditListingBookingPreferencesForm.module.css';

const BOOKING_CONFIRMATION_OPTIONS = [
  {
    value: PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT,
    labelId: 'EditListingBookingPreferencesForm.bookingConfirmationMode.instant',
    helpTextId: 'EditListingBookingPreferencesForm.bookingConfirmationMode.instantHelp',
  },
  {
    value: PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST,
    labelId: 'EditListingBookingPreferencesForm.bookingConfirmationMode.request',
    helpTextId: 'EditListingBookingPreferencesForm.bookingConfirmationMode.requestHelp',
  },
];

const MINIMUM_ADVANCE_NOTICE_OPTIONS = [
  {
    value: PEAKUP_MINIMUM_ADVANCE_NOTICE_30M,
    labelId: 'EditListingBookingPreferencesForm.minimumAdvanceNotice.30m',
  },
  {
    value: PEAKUP_MINIMUM_ADVANCE_NOTICE_2H,
    labelId: 'EditListingBookingPreferencesForm.minimumAdvanceNotice.2h',
  },
  {
    value: PEAKUP_MINIMUM_ADVANCE_NOTICE_12H,
    labelId: 'EditListingBookingPreferencesForm.minimumAdvanceNotice.12h',
  },
  {
    value: PEAKUP_MINIMUM_ADVANCE_NOTICE_24H,
    labelId: 'EditListingBookingPreferencesForm.minimumAdvanceNotice.24h',
  },
  {
    value: PEAKUP_MINIMUM_ADVANCE_NOTICE_48H,
    labelId: 'EditListingBookingPreferencesForm.minimumAdvanceNotice.48h',
  },
  {
    value: PEAKUP_MINIMUM_ADVANCE_NOTICE_72H,
    labelId: 'EditListingBookingPreferencesForm.minimumAdvanceNotice.72h',
  },
  {
    value: PEAKUP_MINIMUM_ADVANCE_NOTICE_7D,
    labelId: 'EditListingBookingPreferencesForm.minimumAdvanceNotice.7d',
  },
];

const UpdateListingError = props => {
  return props.error ? (
    <p className={css.error}>
      <FormattedMessage id="EditListingBookingPreferencesForm.updateFailed" />
    </p>
  ) : null;
};

/**
 * Form for listing booking preferences (confirmation mode and advance notice).
 *
 * @component
 */
export const EditListingBookingPreferencesForm = props => {
  const intl = useIntl();

  return (
    <FinalForm
      {...props}
      render={formRenderProps => {
        const {
          formId = 'EditListingBookingPreferencesForm',
          className,
          fetchErrors,
          handleSubmit,
          ready,
          saveActionMsg,
          updated,
          updateInProgress,
        } = formRenderProps;
        const classes = classNames(css.root, className);
        const { updateListingError } = fetchErrors || {};

        const submitInProgress = updateInProgress;
        const submitReady = updated || ready;
        const submitDisabled = submitInProgress;

        return (
          <Form className={classes} onSubmit={handleSubmit}>
            <section className={css.section}>
              <H5 as="h2" className={css.sectionHeading}>
                <FormattedMessage id="EditListingBookingPreferencesForm.bookingConfirmationMode.title" />
              </H5>
              <div className={css.radioGroup}>
                {BOOKING_CONFIRMATION_OPTIONS.map(option => (
                  <div key={option.value} className={css.radioOption}>
                    <FieldRadioButton
                      id={`${formId}.bookingConfirmationMode.${option.value}`}
                      name="bookingConfirmationMode"
                      value={option.value}
                      label={intl.formatMessage({ id: option.labelId })}
                    />
                    <p className={css.optionHelpText}>
                      <FormattedMessage id={option.helpTextId} />
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className={css.section}>
              <FieldSelect
                className={css.advanceNoticeSelect}
                id={`${formId}.minimumAdvanceNotice`}
                name="minimumAdvanceNotice"
                label={intl.formatMessage({
                  id: 'EditListingBookingPreferencesForm.minimumAdvanceNotice.title',
                })}
                helpText={intl.formatMessage({
                  id: 'EditListingBookingPreferencesForm.minimumAdvanceNotice.help',
                })}
              >
                {MINIMUM_ADVANCE_NOTICE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {intl.formatMessage({ id: option.labelId })}
                  </option>
                ))}
              </FieldSelect>
              <p className={css.warningText}>
                <FormattedMessage id="EditListingBookingPreferencesForm.minimumAdvanceNotice.warning" />
              </p>
            </section>

            <UpdateListingError error={updateListingError} />

            <Button
              className={css.submitButton}
              inProgress={submitInProgress}
              ready={submitReady}
              disabled={submitDisabled}
              type="submit"
            >
              {saveActionMsg}
            </Button>
          </Form>
        );
      }}
    />
  );
};

export default EditListingBookingPreferencesForm;
