import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { Form as FinalForm, Field, FormSpy } from 'react-final-form';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import {
  buildCoachApplicationPayload,
  CERTIFICATION_LEVEL_OPTIONS,
  COACH_APPLICATION_NETLIFY_FORM_NAME,
  COACH_APPLICATION_STEPS,
  COACH_APPLICATION_SUBMIT_MODES,
  getSubmitMode,
  HEAR_ABOUT_OPTIONS,
  validateCoachApplicationStep,
} from '../../util/coachApplication';
import { submitCoachApplication } from '../../util/api';

import {
  FieldCheckbox,
  FieldSelect,
  FieldTextInput,
  ValidationError,
} from '../../components';

import css from './CoachApplicationForm.module.css';

const COACH_APPLICATION_PAGE_TOP_ID = 'coach-application-page-top';

/**
 * Scroll to the coach application hero after a step change (Next / Back).
 * Uses the page-top anchor when present; falls back to window top.
 */
const scrollCoachApplicationPageToTop = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const runScroll = () => {
    const pageTop = document.getElementById(COACH_APPLICATION_PAGE_TOP_ID);
    if (pageTop?.scrollIntoView) {
      pageTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const main = document.querySelector('main');
    if (main?.scrollIntoView) {
      main.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  // Wait for step panel swap and layout before measuring scroll position.
  requestAnimationFrame(() => {
    requestAnimationFrame(runScroll);
  });
};

const LEGAL_POLICY_HREFS = {
  terms: '/p/terms',
  privacy: '/p/privacy-policy',
  cookies: '/p/cookie-policy',
  cancellation: '/p/cancellation-policy',
};

const LegalConsentLabel = () => (
  <FormattedMessage
    id="CoachApplicationPage.acceptLegalLabel"
    values={{
      terms: chunks => (
        <a
          href={LEGAL_POLICY_HREFS.terms}
          className={css.legalLink}
          onClick={e => e.stopPropagation()}
        >
          {chunks}
        </a>
      ),
      privacy: chunks => (
        <a
          href={LEGAL_POLICY_HREFS.privacy}
          className={css.legalLink}
          onClick={e => e.stopPropagation()}
        >
          {chunks}
        </a>
      ),
      cookies: chunks => (
        <a
          href={LEGAL_POLICY_HREFS.cookies}
          className={css.legalLink}
          onClick={e => e.stopPropagation()}
        >
          {chunks}
        </a>
      ),
      cancellation: chunks => (
        <a
          href={LEGAL_POLICY_HREFS.cancellation}
          className={css.legalLink}
          onClick={e => e.stopPropagation()}
        >
          {chunks}
        </a>
      ),
    }}
  />
);

const STEP_TRACKER = [
  { id: 'referral', num: '01', labelId: 'CoachApplicationPage.stepTrack01' },
  { id: 'personal', num: '02', labelId: 'CoachApplicationPage.stepTrack02' },
  { id: 'coaching', num: '03', labelId: 'CoachApplicationPage.stepTrack03' },
  { id: 'documents', num: '04', labelId: 'CoachApplicationPage.stepTrack04' },
  { id: 'consent', num: '05', labelId: 'CoachApplicationPage.stepTrack05' },
];

const STEP_TITLE_IDS = {
  referral: 'CoachApplicationPage.stepReferralTitle',
  personal: 'CoachApplicationPage.stepPersonalTitle',
  coaching: 'CoachApplicationPage.stepCoachingTitle',
  documents: 'CoachApplicationPage.stepDocumentsTitle',
  consent: 'CoachApplicationPage.stepConsentTitle',
};

const STEP_HINT_IDS = {
  referral: 'CoachApplicationPage.stepReferralHint',
  personal: 'CoachApplicationPage.stepPersonalHint',
  coaching: 'CoachApplicationPage.stepCoachingHint',
  documents: 'CoachApplicationPage.stepDocumentsHint',
  consent: 'CoachApplicationPage.stepConsentHint',
};

const StepTracker = ({ currentIndex }) => {
  const intl = useIntl();
  return (
    <nav
      className={css.stepTracker}
      aria-label={intl.formatMessage({ id: 'CoachApplicationPage.stepNav' })}
    >
      <ol className={css.stepTrackerList}>
        {STEP_TRACKER.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          return (
            <li
              key={step.id}
              className={classNames(css.stepTrackerItem, {
                [css.stepTrackerItemActive]: isActive,
                [css.stepTrackerItemCompleted]: isCompleted,
              })}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className={css.stepTrackerDot}>
                {isCompleted ? (
                  <svg className={css.stepTrackerCheck} viewBox="0 0 14 14" aria-hidden="true">
                    <path
                      d="M3 7l3 3 5-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  step.num
                )}
              </span>
              <span className={css.stepTrackerLabel}>
                {intl.formatMessage({ id: step.labelId })}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/**
 * Premium drag-and-drop style document upload card.
 */
const CoachApplicationFileField = props => {
  const { name, label, optional, input, meta, accept } = props;
  const intl = useIntl();
  const [dragOver, setDragOver] = useState(false);
  const file = input.value;
  const hasError = meta.touched && meta.error;
  const isDone = Boolean(file?.name);

  const handleDrop = e => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) {
      input.onChange(dropped);
      input.onBlur();
    }
  };

  return (
    <div className={css.uploadCard}>
      <span className={css.uploadCardLabel} id={`${name}-label`}>
        {label}
        {optional ? (
          <span className={css.uploadCardOptional}>
            {' '}
            (<FormattedMessage id="CoachApplicationPage.optional" />)
          </span>
        ) : null}
      </span>
      <label
        className={classNames(css.uploadDropzone, {
          [css.uploadDropzoneDrag]: dragOver,
          [css.uploadDropzoneDone]: isDone,
        })}
        htmlFor={name}
        onDragOver={e => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          id={name}
          name={input.name}
          type="file"
          className={css.uploadInput}
          accept={accept}
          onChange={e => input.onChange(e.target.files?.[0] || null)}
          onBlur={input.onBlur}
          aria-labelledby={`${name}-label`}
        />
        {isDone ? <span className={css.uploadCheck} aria-hidden="true">✓</span> : null}
        <span className={css.uploadIcon} aria-hidden="true">
          {isDone ? '✓' : '↑'}
        </span>
        <p className={css.uploadPrompt}>
          {isDone
            ? intl.formatMessage({ id: 'CoachApplicationPage.uploadDone' })
            : intl.formatMessage({ id: 'CoachApplicationPage.uploadDropHint' })}
        </p>
        {file?.name ? (
          <p className={css.uploadFileName}>{file.name}</p>
        ) : (
          <p className={css.uploadSub}>
            <FormattedMessage id="CoachApplicationPage.fileHelp" />
          </p>
        )}
      </label>
      {hasError ? <ValidationError>{meta.error}</ValidationError> : null}
    </div>
  );
};

/**
 * Multi-step PeakUp coach application form.
 */
const CoachApplicationForm = props => {
  const { onSuccess } = props;
  const intl = useIntl();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const skipInitialScrollRef = useRef(true);

  useEffect(() => {
    if (skipInitialScrollRef.current) {
      skipInitialScrollRef.current = false;
      return;
    }
    scrollCoachApplicationPageToTop();
  }, [stepIndex]);

  const stepId = COACH_APPLICATION_STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === COACH_APPLICATION_STEPS.length - 1;

  const messageForKey = useCallback(
    key =>
      intl.formatMessage({
        id: `CoachApplicationPage.${key}`,
        defaultMessage: 'This field is required.',
      }),
    [intl]
  );

  const hearAboutOptions = HEAR_ABOUT_OPTIONS.map(value => ({
    key: value,
    label: intl.formatMessage({ id: `CoachApplicationPage.hearAbout.${value}` }),
  }));

  const certificationOptions = CERTIFICATION_LEVEL_OPTIONS.map(value => ({
    key: value,
    label: intl.formatMessage({ id: `CoachApplicationPage.certification.${value}` }),
  }));

  const validateStep = values => {
    const stepErrors = validateCoachApplicationStep(stepId, values, messageForKey);
    const mapped = {};
    Object.entries(stepErrors).forEach(([errorKey]) => {
      const fieldMap = {
        hearAboutPeakUpRequired: 'hearAboutPeakUp',
        fullNameRequired: 'fullName',
        emailRequired: 'email',
        emailInvalid: 'email',
        phoneRequired: 'phone',
        dateOfBirthRequired: 'dateOfBirth',
        countryRequired: 'country',
        cityAreaRequired: 'cityArea',
        languagesRequired: 'languagesSpoken',
        mainSportRequired: 'mainSport',
        yearsExperienceRequired: 'yearsExperience',
        certificationLevelRequired: 'certificationLevel',
        shortBioRequired: 'shortBio',
        idDocumentRequired: 'idDocument',
        coachingCertificatesRequired: 'coachingCertificates',
        acceptLegalRequired: 'acceptLegal',
        acceptVerificationRequired: 'acceptVerification',
      };
      const field = fieldMap[errorKey] || errorKey;
      mapped[field] = messageForKey(errorKey);
    });
    return mapped;
  };

  const submitToNetlify = (values, payload) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/';
    form.setAttribute('data-netlify', 'true');

    const addField = (fieldName, value) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = fieldName;
      input.value = typeof value === 'string' ? value : JSON.stringify(value);
      form.appendChild(input);
    };

    addField('form-name', COACH_APPLICATION_NETLIFY_FORM_NAME);
    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'files') {
        addField('filesSummary', JSON.stringify(value));
        return;
      }
      if (typeof value === 'boolean') {
        addField(key, value ? 'yes' : 'no');
      } else {
        addField(key, value ?? '');
      }
    });

    document.body.appendChild(form);
    form.submit();
    onSuccess(values);
  };

  const handleSubmit = async values => {
    if (!isLastStep) {
      setStepIndex(i => Math.min(i + 1, COACH_APPLICATION_STEPS.length - 1));
      scrollCoachApplicationPageToTop();
      return undefined;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const payload = await buildCoachApplicationPayload(values);
      const mode = getSubmitMode();

      if (mode === COACH_APPLICATION_SUBMIT_MODES.NETLIFY) {
        submitToNetlify(values, payload);
        return undefined;
      }

      await submitCoachApplication(payload);
      onSuccess(values);
      return undefined;
    } catch (e) {
      if (e?.message === 'COACH_APPLICATION_FILE_TOO_LARGE') {
        setSubmitError(intl.formatMessage({ id: 'CoachApplicationPage.fileTooLarge' }));
      } else if (e?.message === 'COACH_APPLICATION_FILE_TYPE') {
        setSubmitError(intl.formatMessage({ id: 'CoachApplicationPage.fileTypeInvalid' }));
      } else {
        setSubmitError(
          e?.data?.message ||
            e?.message ||
            intl.formatMessage({ id: 'CoachApplicationPage.submitFailed' })
        );
      }
      return undefined;
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    setStepIndex(i => Math.max(i - 1, 0));
    scrollCoachApplicationPageToTop();
  };

  return (
    <FinalForm
      onSubmit={handleSubmit}
      validate={validateStep}
      keepDirtyOnReinitialize
      render={({ handleSubmit: formSubmit, hasValidationErrors, submitting: formSubmitting }) => (
        <form
          className={css.card}
          onSubmit={formSubmit}
          name={COACH_APPLICATION_NETLIFY_FORM_NAME}
          data-netlify={
            getSubmitMode() === COACH_APPLICATION_SUBMIT_MODES.NETLIFY ? 'true' : undefined
          }
          data-netlify-honeypot="bot-field"
        >
          <input type="hidden" name="form-name" value={COACH_APPLICATION_NETLIFY_FORM_NAME} />
          <p className={css.visuallyHidden}>
            <label>
              Don&apos;t fill this out: <input name="bot-field" />
            </label>
          </p>

          <StepTracker currentIndex={stepIndex} />

          <div key={stepId} className={css.stepPanel}>
            <h2 className={css.stepTitle}>
              <FormattedMessage id={STEP_TITLE_IDS[stepId]} defaultMessage={stepId} />
            </h2>
            <p className={css.stepHint}>
              <FormattedMessage id={STEP_HINT_IDS[stepId]} defaultMessage="" />
            </p>

            <div className={css.fields}>
              {stepId === 'referral' ? (
                <>
                  <FieldSelect
                    id="hearAboutPeakUp"
                    name="hearAboutPeakUp"
                    label={intl.formatMessage({ id: 'CoachApplicationPage.hearAboutLabel' })}
                  >
                    <option value="">
                      {intl.formatMessage({ id: 'CoachApplicationPage.selectPlaceholder' })}
                    </option>
                    {hearAboutOptions.map(opt => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </FieldSelect>
                  <FormSpy subscription={{ values: true }}>
                    {({ values }) => {
                      const ambassadorInterest = Boolean(values?.interestedInAmbassador);
                      return (
                        <>
                          <div className={css.checkboxGroup}>
                            <div className={css.checkboxPremium}>
                              <FieldCheckbox
                                id="applyingIndependently"
                                name="applyingIndependently"
                                label={intl.formatMessage({
                                  id: 'CoachApplicationPage.applyingIndependentlyLabel',
                                })}
                                value="yes"
                              />
                            </div>
                            <div className={css.checkboxPremium}>
                              <FieldCheckbox
                                id="interestedInAmbassador"
                                name="interestedInAmbassador"
                                label={intl.formatMessage({
                                  id: 'CoachApplicationPage.interestedInAmbassadorLabel',
                                })}
                                value="yes"
                              />
                            </div>
                          </div>
                          <div
                            className={classNames(css.ambassadorPanel, {
                              [css.ambassadorPanelOpen]: ambassadorInterest,
                            })}
                            aria-hidden={!ambassadorInterest}
                          >
                            <div className={css.ambassadorPanelInner}>
                              <p className={css.ambassadorPanelTitle}>
                                <FormattedMessage id="CoachApplicationPage.ambassadorPanelTitle" />
                              </p>
                              <p className={css.ambassadorPanelHint}>
                                <FormattedMessage id="CoachApplicationPage.ambassadorPanelHint" />
                              </p>
                              <FieldTextInput
                                id="ambassadorReferralCode"
                                name="ambassadorReferralCode"
                                type="text"
                                label={intl.formatMessage({
                                  id: 'CoachApplicationPage.ambassadorCodeLabel',
                                })}
                                placeholder={intl.formatMessage({
                                  id: 'CoachApplicationPage.ambassadorCodePlaceholder',
                                })}
                              />
                            </div>
                          </div>
                          {!ambassadorInterest ? (
                            <FieldTextInput
                              id="ambassadorReferralCode"
                              name="ambassadorReferralCode"
                              type="text"
                              label={intl.formatMessage({
                                id: 'CoachApplicationPage.ambassadorCodeLabel',
                              })}
                              placeholder={intl.formatMessage({
                                id: 'CoachApplicationPage.ambassadorCodePlaceholder',
                              })}
                            />
                          ) : null}
                        </>
                      );
                    }}
                  </FormSpy>
                </>
              ) : null}

              {stepId === 'personal' ? (
                <>
                  <FieldTextInput
                    id="fullName"
                    name="fullName"
                    type="text"
                    label={intl.formatMessage({ id: 'CoachApplicationPage.fullNameLabel' })}
                  />
                  <div className={classNames(css.fieldRow, css.fieldRowTwo)}>
                    <FieldTextInput
                      id="email"
                      name="email"
                      type="email"
                      label={intl.formatMessage({ id: 'CoachApplicationPage.emailLabel' })}
                    />
                    <FieldTextInput
                      id="phone"
                      name="phone"
                      type="tel"
                      label={intl.formatMessage({ id: 'CoachApplicationPage.phoneLabel' })}
                    />
                  </div>
                  <FieldTextInput
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    label={intl.formatMessage({ id: 'CoachApplicationPage.dateOfBirthLabel' })}
                  />
                  <div className={classNames(css.fieldRow, css.fieldRowTwo)}>
                    <FieldTextInput
                      id="country"
                      name="country"
                      type="text"
                      label={intl.formatMessage({ id: 'CoachApplicationPage.countryLabel' })}
                    />
                    <FieldTextInput
                      id="cityArea"
                      name="cityArea"
                      type="text"
                      label={intl.formatMessage({ id: 'CoachApplicationPage.cityAreaLabel' })}
                    />
                  </div>
                  <FieldTextInput
                    id="languagesSpoken"
                    name="languagesSpoken"
                    type="textarea"
                    label={intl.formatMessage({ id: 'CoachApplicationPage.languagesLabel' })}
                  />
                </>
              ) : null}

              {stepId === 'coaching' ? (
                <>
                  <FieldTextInput
                    id="mainSport"
                    name="mainSport"
                    type="text"
                    label={intl.formatMessage({ id: 'CoachApplicationPage.mainSportLabel' })}
                    placeholder={intl.formatMessage({
                      id: 'CoachApplicationPage.mainSportPlaceholder',
                    })}
                  />
                  <FieldTextInput
                    id="otherSports"
                    name="otherSports"
                    type="textarea"
                    rows={3}
                    label={intl.formatMessage({ id: 'CoachApplicationPage.otherSportsLabel' })}
                    placeholder={intl.formatMessage({
                      id: 'CoachApplicationPage.otherSportsPlaceholder',
                    })}
                  />
                  <div className={classNames(css.fieldRow, css.fieldRowTwo)}>
                    <FieldTextInput
                      id="yearsExperience"
                      name="yearsExperience"
                      type="number"
                      label={intl.formatMessage({
                        id: 'CoachApplicationPage.yearsExperienceLabel',
                      })}
                    />
                    <FieldSelect
                      id="certificationLevel"
                      name="certificationLevel"
                      label={intl.formatMessage({
                        id: 'CoachApplicationPage.certificationLevelLabel',
                      })}
                    >
                      <option value="">
                        {intl.formatMessage({ id: 'CoachApplicationPage.selectPlaceholder' })}
                      </option>
                      {certificationOptions.map(opt => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </FieldSelect>
                  </div>
                  <FieldTextInput
                    id="federationSchool"
                    name="federationSchool"
                    type="text"
                    label={intl.formatMessage({
                      id: 'CoachApplicationPage.federationSchoolLabel',
                    })}
                  />
                  <FieldTextInput
                    id="shortBio"
                    name="shortBio"
                    type="textarea"
                    label={intl.formatMessage({ id: 'CoachApplicationPage.shortBioLabel' })}
                  />
                  <FieldTextInput
                    id="instagramWebsite"
                    name="instagramWebsite"
                    type="text"
                    label={intl.formatMessage({
                      id: 'CoachApplicationPage.instagramWebsiteLabel',
                    })}
                  />
                </>
              ) : null}

              {stepId === 'documents' ? (
                <>
                  <Field
                    name="idDocument"
                    component={CoachApplicationFileField}
                    label={intl.formatMessage({ id: 'CoachApplicationPage.idDocumentLabel' })}
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                  />
                  <Field
                    name="coachingCertificates"
                    component={CoachApplicationFileField}
                    label={intl.formatMessage({
                      id: 'CoachApplicationPage.coachingCertificatesLabel',
                    })}
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                  />
                  <Field
                    name="insuranceDocument"
                    component={CoachApplicationFileField}
                    optional
                    label={intl.formatMessage({
                      id: 'CoachApplicationPage.insuranceDocumentLabel',
                    })}
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                  />
                  <Field
                    name="otherDocuments"
                    component={CoachApplicationFileField}
                    optional
                    label={intl.formatMessage({ id: 'CoachApplicationPage.otherDocumentsLabel' })}
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                  />
                </>
              ) : null}

              {stepId === 'consent' ? (
                <div className={css.checkboxGroup}>
                  <div className={css.checkboxPremium}>
                    <FieldCheckbox
                      id="acceptLegal"
                      name="acceptLegal"
                      label={<LegalConsentLabel />}
                      textClassName={css.legalConsentText}
                      value="yes"
                    />
                  </div>
                  <div className={css.checkboxPremium}>
                    <FieldCheckbox
                      id="acceptVerification"
                      name="acceptVerification"
                      label={intl.formatMessage({
                        id: 'CoachApplicationPage.acceptVerificationLabel',
                      })}
                      value="yes"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {submitError ? <p className={css.submitError}>{submitError}</p> : null}

          <div className={css.actions}>
            {!isFirstStep ? (
              <button
                type="button"
                className={css.backButton}
                onClick={goBack}
                disabled={submitting}
              >
                <FormattedMessage id="CoachApplicationPage.back" />
              </button>
            ) : null}
            {isLastStep ? (
              <button
                type="submit"
                className={css.submitButton}
                disabled={submitting || formSubmitting || hasValidationErrors}
              >
                <FormattedMessage id="CoachApplicationPage.submit" />
              </button>
            ) : (
              <button
                type="submit"
                className={css.nextButton}
                disabled={submitting || formSubmitting}
              >
                <FormattedMessage id="CoachApplicationPage.next" />
              </button>
            )}
          </div>
        </form>
      )}
    />
  );
};

export default CoachApplicationForm;
