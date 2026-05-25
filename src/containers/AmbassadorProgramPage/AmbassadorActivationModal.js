import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { activateAmbassadorProgram } from '../../util/api';
import {
  buildAmbassadorReferralLink,
  canAccessAmbassadorActivation,
  getAmbassadorProfileState,
  isAmbassadorActive,
} from '../../util/ambassadorActivation';
import { fetchCurrentUser } from '../../ducks/user.duck';
import { manageDisableScrolling } from '../../ducks/ui.duck';

import { Modal, NamedLink, PrimaryButton, SecondaryButton } from '../../components';

import {
  ACTIVATION_INTRO,
  ACTIVATION_SECTIONS,
  ACTIVATION_TIER_CHIPS,
} from './ambassadorActivationContent';
import css from './AmbassadorActivationModal.module.css';

const MODAL_ID = 'AmbassadorActivationModal';

/**
 * Verified-coach-only Ambassador Program onboarding modal.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 */
const AmbassadorActivationModal = ({ isOpen, onClose }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const location = useLocation();
  const config = useConfiguration();
  const currentUser = useSelector(state => state.user.currentUser);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUserHasListings = useSelector(state => state.user.currentUserHasListings);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [activationResult, setActivationResult] = useState(null);

  const onManageDisableScrolling = useCallback(
    (componentId, disableScrolling) => {
      dispatch(manageDisableScrolling(componentId, disableScrolling));
    },
    [dispatch]
  );

  const profileState = useMemo(() => getAmbassadorProfileState(currentUser), [currentUser]);

  const alreadyActive = isAmbassadorActive(currentUser);
  const canActivate = canAccessAmbassadorActivation(config, currentUser, {
    hasListings: currentUserHasListings,
  });
  const canSubmit = canActivate && acceptTerms && !submitting;

  const loginFromState = useMemo(
    () => ({ from: `${location.pathname}${location.search}${location.hash}` }),
    [location.hash, location.pathname, location.search]
  );

  const resetFormState = () => {
    setAcceptTerms(false);
    setSubmitError(null);
    setActivationResult(null);
  };

  const handleClose = () => {
    resetFormState();
    onClose();
  };

  const handleActivate = async () => {
    if (!canActivate || !acceptTerms || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await activateAmbassadorProgram({ acceptTerms: true });
      setActivationResult(response.activation);
      await dispatch(fetchCurrentUser({ enforce: true }));
    } catch (error) {
      setSubmitError(
        error.message || intl.formatMessage({ id: 'AmbassadorActivationModal.activateError' })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const referralCode =
    activationResult?.ambassadorReferralCode || profileState.ambassadorReferralCode;
  const referralLink =
    activationResult?.referralLink ||
    (referralCode ? buildAmbassadorReferralLink(referralCode) : '');

  const renderGate = () => {
    if (!isAuthenticated) {
      return (
        <div className={css.gatePanel}>
          <h2 className={css.gateTitle}>
            <FormattedMessage id="AmbassadorActivationModal.loginTitle" />
          </h2>
          <p className={css.gateBody}>
            <FormattedMessage id="AmbassadorActivationModal.loginBody" />
          </p>
          <div className={css.gateActions}>
            <NamedLink name="LoginPage" className={css.primaryAction} state={loginFromState}>
              <FormattedMessage id="AmbassadorActivationModal.loginCta" />
            </NamedLink>
            <SecondaryButton type="button" onClick={handleClose}>
              <FormattedMessage id="AmbassadorActivationModal.close" />
            </SecondaryButton>
          </div>
        </div>
      );
    }

    if (alreadyActive || activationResult) {
      return (
        <div className={css.gatePanel}>
          <h2 className={css.gateTitle}>
            <FormattedMessage id="AmbassadorActivationModal.successTitle" />
          </h2>
          <p className={css.gateBody}>
            <FormattedMessage id="AmbassadorActivationModal.successBody" />
          </p>
          {referralCode ? (
            <div className={css.successCard}>
              <p className={css.successLabel}>
                <FormattedMessage id="AmbassadorActivationModal.referralCodeLabel" />
              </p>
              <p className={css.successCode}>{referralCode}</p>
              {referralLink ? (
                <p className={css.successLink}>
                  <a href={referralLink} target="_blank" rel="noopener noreferrer">
                    {referralLink}
                  </a>
                </p>
              ) : null}
            </div>
          ) : null}
          <div className={css.gateActions}>
            <NamedLink name="ReferralCenterPage" className={css.primaryAction}>
              <FormattedMessage id="AmbassadorActivationModal.referralCenterCta" />
            </NamedLink>
            <SecondaryButton type="button" onClick={handleClose}>
              <FormattedMessage id="AmbassadorActivationModal.close" />
            </SecondaryButton>
          </div>
        </div>
      );
    }

    return null;
  };

  const gatePanel = renderGate();
  if (gatePanel) {
    return (
      <Modal
        id={MODAL_ID}
        className={css.modal}
        scrollLayerClassName={css.scrollLayer}
        containerClassName={css.container}
        contentClassName={css.content}
        isOpen={isOpen}
        onClose={handleClose}
        onManageDisableScrolling={onManageDisableScrolling}
        usePortal
        lightCloseButton
        closeOnOutsideClick
      >
        {gatePanel}
      </Modal>
    );
  }

  return (
    <Modal
      id={MODAL_ID}
      className={css.modal}
      scrollLayerClassName={css.scrollLayer}
      containerClassName={css.container}
      contentClassName={css.content}
      isOpen={isOpen}
      onClose={handleClose}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal
      lightCloseButton
      closeOnOutsideClick
    >
      <div className={css.shell}>
        <header className={css.header}>
          <p className={css.eyebrow}>
            <FormattedMessage id={ACTIVATION_INTRO.eyebrowId} />
          </p>
          <h2 className={css.title}>
            <FormattedMessage id={ACTIVATION_INTRO.titleId} />
          </h2>
          <p className={css.lead}>
            <FormattedMessage id={ACTIVATION_INTRO.leadId} />
          </p>
        </header>

        <div className={css.sections}>
          {ACTIVATION_SECTIONS.map(section => (
            <section key={section.id} className={css.section}>
              <h3 className={css.sectionTitle}>
                <FormattedMessage id={section.titleId} />
              </h3>
              <p className={css.sectionBody}>
                <FormattedMessage id={section.bodyId} />
              </p>
              {section.id === 'tiers' ? (
                <ul
                  className={css.tierChips}
                  aria-label={intl.formatMessage({ id: 'AmbassadorActivationModal.tiersAria' })}
                >
                  {ACTIVATION_TIER_CHIPS.map(tier => (
                    <li
                      key={tier.id}
                      className={classNames(
                        css.tierChip,
                        tier.id === 'bronze' ? css.tierChipActive : null
                      )}
                    >
                      <FormattedMessage id={tier.labelId} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div className={css.termsBlock}>
          <label className={css.termsRow}>
            <input
              type="checkbox"
              className={css.termsCheckbox}
              checked={acceptTerms}
              disabled={!canActivate}
              onChange={event => setAcceptTerms(event.target.checked)}
            />
            <span className={css.termsCopy}>
              <FormattedMessage id="AmbassadorActivationModal.termsLabel" />
            </span>
          </label>
        </div>

        {!canActivate ? (
          <p className={css.accessWarning} role="alert">
            <FormattedMessage id="AmbassadorActivationModal.notVerifiedBody" />
          </p>
        ) : null}

        {submitError ? <p className={css.error}>{submitError}</p> : null}

        <footer className={css.footer}>
          <PrimaryButton
            type="button"
            className={classNames(css.activateButton, canSubmit ? css.activateButtonReady : null)}
            disabled={!canSubmit}
            inProgress={submitting}
            onClick={handleActivate}
          >
            <FormattedMessage id="AmbassadorActivationModal.activateCta" />
          </PrimaryButton>
          <SecondaryButton type="button" onClick={handleClose} disabled={submitting}>
            <FormattedMessage id="AmbassadorActivationModal.close" />
          </SecondaryButton>
        </footer>
      </div>
    </Modal>
  );
};

export default AmbassadorActivationModal;
