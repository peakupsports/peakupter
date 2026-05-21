import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import * as validators from '../../../util/validators';
import { isContactSharingBlockedError } from '../../../util/errors';
import { noContactSharingBeforeBookingValidator } from '../../../util/peakupContactSharing';
import { propTypes } from '../../../util/types';

import {
  ErrorMessage,
  FieldTextInput,
  Form,
  Heading,
  IconInquiry,
  PrimaryButton,
} from '../../../components';

import css from './InquiryForm.module.css';

/**
 * The InquiryForm component.
 * NOTE: this InquiryForm is only for booking & purchase processes
 * The default-inquiry process is handled differently
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.submitButtonWrapperClassName] - Custom class to be passed for the submit button wrapper
 * @param {boolean} [props.inProgress] - Whether the inquiry is in progress
 * @param {string} props.listingTitle - The listing title
 * @param {string} props.authorDisplayName - The author display name
 * @param {string} [props.headingMessageId] - Optional intl id for modal heading
 * @param {Object} [props.headingValues] - Values for heading message
 * @param {string} [props.messageLabelMessageId] - Optional intl id for message label
 * @param {string} [props.messagePlaceholderMessageId] - Optional intl id for placeholder
 * @param {string} [props.submitButtonMessageId] - Optional intl id for submit button
 * @param {boolean} [props.hideInquiryIcon] - Hide default inquiry icon (PeakUp contact modal)
 * @param {boolean} [props.hideHeading] - Hide built-in heading (parent renders title)
 * @param {boolean} [props.hideMessageLabel] - Hide message field label
 * @param {string} [props.headingRootClassName] - Override heading class
 * @param {string} [props.fieldClassName] - Override field wrapper class
 * @param {string} [props.submitButtonRootClassName] - Override PrimaryButton root class
 * @param {propTypes.error} props.sendInquiryError - The send inquiry error
 * @returns {JSX.Element} inquiry form component
 */
const InquiryForm = props => (
  <FinalForm
    {...props}
    render={fieldRenderProps => {
      const {
        rootClassName,
        className,
        submitButtonWrapperClassName,
        formId,
        handleSubmit,
        inProgress = false,
        listingTitle,
        authorDisplayName,
        sendInquiryError,
        headingMessageId = 'InquiryForm.heading',
        headingValues,
        messageLabelMessageId = 'InquiryForm.messageLabel',
        messagePlaceholderMessageId = 'InquiryForm.messagePlaceholder',
        submitButtonMessageId = 'InquiryForm.submitButtonText',
        hideInquiryIcon = false,
        hideHeading = false,
        hideMessageLabel = false,
        headingRootClassName,
        fieldClassName,
        submitButtonRootClassName,
      } = fieldRenderProps;

      const intl = useIntl();
      const coachName = authorDisplayName || listingTitle || '';
      const intlValues = { authorDisplayName, coachName, listingTitle };

      const messageLabel = hideMessageLabel
        ? null
        : intl.formatMessage(
            {
              id: messageLabelMessageId,
            },
            intlValues
          );
      const messagePlaceholder = intl.formatMessage(
        {
          id: messagePlaceholderMessageId,
        },
        intlValues
      );
      const messageRequiredMessage = intl.formatMessage({
        id: 'InquiryForm.messageRequired',
      });
      const messageRequired = validators.requiredAndNonEmptyString(messageRequiredMessage);
      const noContactSharing = noContactSharingBeforeBookingValidator(intl);
      const validateMessage = value => messageRequired(value) || noContactSharing(value);

      const classes = classNames(rootClassName || css.root, className);
      const contactSharingBlocked = isContactSharingBlockedError(sendInquiryError);
      const submitInProgress = inProgress;
      const submitDisabled = submitInProgress;

      return (
        <Form className={classes} onSubmit={handleSubmit} enforcePagePreloadFor="OrderDetailsPage">
          {hideInquiryIcon ? null : <IconInquiry className={css.icon} />}
          {hideHeading ? null : (
            <Heading as="h2" rootClassName={headingRootClassName || css.heading}>
              <FormattedMessage
                id={headingMessageId}
                values={headingValues || { listingTitle, coachName }}
              />
            </Heading>
          )}
          <FieldTextInput
            className={fieldClassName || css.field}
            type="textarea"
            name="message"
            id={formId ? `${formId}.message` : 'message'}
            label={messageLabel}
            placeholder={messagePlaceholder}
            validate={validateMessage}
          />
          <div className={submitButtonWrapperClassName}>
            {contactSharingBlocked ? (
              <p className={css.contactSharingWarning} role="alert">
                <FormattedMessage id="SendMessageForm.contactSharingBlocked" />
              </p>
            ) : (
              <ErrorMessage error={sendInquiryError} />
            )}
            <PrimaryButton
              type="submit"
              inProgress={submitInProgress}
              disabled={submitDisabled}
              rootClassName={submitButtonRootClassName}
            >
              <FormattedMessage id={submitButtonMessageId} />
            </PrimaryButton>
          </div>
        </Form>
      );
    }}
  />
);

export default InquiryForm;
