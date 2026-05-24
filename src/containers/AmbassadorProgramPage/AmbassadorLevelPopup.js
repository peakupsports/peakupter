import React, { useCallback } from 'react';
import classNames from 'classnames';
import { useDispatch } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { manageDisableScrolling } from '../../ducks/ui.duck';
import { Modal } from '../../components';

import { AMBASSADOR_LEVELS } from './ambassadorProgramContent';
import {
  AMBASSADOR_LEVEL_POPUP_DETAILS,
  LEVEL_POPUP_CRITERIA_HELPER_IDS,
  LEVEL_POPUP_CRITERIA_LABEL_IDS,
  LEVEL_POPUP_CRITERIA_ORDER,
  LEVEL_POPUP_GLOBAL,
} from './ambassadorLevelPopupContent';
import { InfoIcon, RenewalShieldIcon, renderBenefitIcon, renderCriteriaIcon } from './AmbassadorLevelPopupIcons';
import css from './AmbassadorLevelPopup.module.css';

const MODAL_ID = 'AmbassadorProgramLevelPopup';

/**
 * Premium informational popup for an ambassador tier (criteria + benefits).
 *
 * @param {Object} props
 * @param {string|null} props.tierId bronze | silver | gold | platinum | diamond
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 */
const AmbassadorLevelPopup = ({ tierId, isOpen, onClose }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const onManageDisableScrolling = useCallback(
    (componentId, disableScrolling) => {
      dispatch(manageDisableScrolling(componentId, disableScrolling));
    },
    [dispatch]
  );

  const level = AMBASSADOR_LEVELS.find(item => item.id === tierId);
  const detail = tierId ? AMBASSADOR_LEVEL_POPUP_DETAILS[tierId] : null;

  if (!level || !detail) {
    return null;
  }

  const tierName = intl.formatMessage({ id: level.nameId });
  const isDiamond = tierId === 'diamond';
  const { primaryReward } = detail;

  return (
    <Modal
      id={MODAL_ID}
      className={css.modal}
      scrollLayerClassName={css.scrollLayer}
      containerClassName={classNames(css.container, css[`container_${level.tierClass}`])}
      contentClassName={css.content}
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal
      lightCloseButton
      closeOnOutsideClick
    >
      <div className={css.shell}>
        {isDiamond ? (
          <div className={css.diamondAura} aria-hidden="true">
            <span className={css.diamondParticle} />
            <span className={css.diamondParticle} />
            <span className={css.diamondParticle} />
            <span className={css.diamondParticle} />
            <span className={css.diamondParticle} />
            <span className={css.diamondParticle} />
          </div>
        ) : null}
        <div className={css.mainGrid}>
          <aside className={classNames(css.tierAside, css[`tierAside_${level.tierClass}`])}>
            <div className={classNames(css.badgeFrame, css[`badgeFrame_${level.tierClass}`])}>
              <span className={css.badgeGlow} aria-hidden="true" />
              <span className={css.badgeEdgeLight} aria-hidden="true" />
              <span className={css.badgeSweep} aria-hidden="true" />
              <img
                className={css.badgeImage}
                src={level.imageSrc}
                alt={tierName}
                loading="lazy"
                decoding="async"
              />
            </div>
            <h2 className={css.tierName}>{tierName}</h2>
            <p className={css.tierDesc}>
              <FormattedMessage id={level.descId} />
            </p>
            <div
              className={classNames(
                css.primaryRewardCard,
                css[`primaryRewardCard_${level.tierClass}`]
              )}
            >
              <span className={css.primaryRewardPercent}>
                <FormattedMessage id={primaryReward.percentId} />
              </span>
              <span className={css.primaryRewardTitle}>
                <FormattedMessage id={primaryReward.titleId} />
              </span>
              <span className={css.primaryRewardDesc}>
                <FormattedMessage id={primaryReward.descId} />
              </span>
            </div>
          </aside>

          <section className={css.criteriaPanel} aria-labelledby="ambassador-level-criteria">
            <h3 id="ambassador-level-criteria" className={css.panelTitle}>
              <FormattedMessage id={LEVEL_POPUP_GLOBAL.criteriaTitleId} />
            </h3>
            <ul className={css.criteriaList}>
              {LEVEL_POPUP_CRITERIA_ORDER.map(key => {
                const isCancellationRow = key === 'cancellations';
                const helperId = LEVEL_POPUP_CRITERIA_HELPER_IDS[key];

                return (
                  <li
                    key={key}
                    className={classNames(
                      css.criteriaRow,
                      isCancellationRow ? css.criteriaRowWarning : css.criteriaRowCard
                    )}
                  >
                    <span
                      className={classNames(
                        css.criteriaIconWrap,
                        isCancellationRow ? css.criteriaIconWrapWarning : null
                      )}
                    >
                      {renderCriteriaIcon(key, css.criteriaIconSvg)}
                    </span>
                    <span className={css.criteriaLabelBlock}>
                      <span className={css.criteriaLabel}>
                        <FormattedMessage id={LEVEL_POPUP_CRITERIA_LABEL_IDS[key]} />
                      </span>
                      {helperId ? (
                        <span className={css.criteriaHelper}>
                          <FormattedMessage id={helperId} />
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={classNames(
                        css.criteriaValue,
                        isCancellationRow ? css.criteriaValueWarning : null
                      )}
                    >
                      <FormattedMessage id={detail.criteria[key]} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={css.benefitsPanel} aria-labelledby="ambassador-level-benefits">
            <h3 id="ambassador-level-benefits" className={css.panelTitle}>
              <FormattedMessage id={LEVEL_POPUP_GLOBAL.benefitsTitleId} />
            </h3>
            <ul className={css.benefitsList}>
              {detail.benefits.map(benefit => (
                <li
                  key={benefit.id}
                  className={classNames(
                    css.benefitRow,
                    css.benefitRowSecondary,
                    benefit.accent ? css[`benefitRow_${benefit.accent}`] : null
                  )}
                >
                  <span
                    className={classNames(
                      css.benefitIconWrap,
                      css.benefitIconWrapSecondary,
                      benefit.accent ? css[`benefitIconWrap_${benefit.accent}`] : null
                    )}
                  >
                    {renderBenefitIcon(benefit.icon, css.benefitIconSvg)}
                  </span>
                  <span className={css.benefitCopy}>
                    <span className={css.benefitTitle}>
                      <FormattedMessage id={benefit.id} />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className={css.footer}>
          <div className={css.renewalCard}>
            <span className={css.renewalIconWrap} aria-hidden="true">
              <RenewalShieldIcon className={css.renewalIconSvg} />
            </span>
            <div className={css.renewalContent}>
              <h4 className={css.renewalTitle}>
                <FormattedMessage id={LEVEL_POPUP_GLOBAL.renewalTitleId} />
              </h4>
              <p className={css.renewalBody}>
                <FormattedMessage id={LEVEL_POPUP_GLOBAL.renewalBodyId} />
              </p>
            </div>
          </div>

          <div className={css.commissionBar} role="note">
            <span className={css.commissionIconWrap} aria-hidden="true">
              <InfoIcon className={css.commissionIconSvg} />
            </span>
            <p className={css.commissionText}>
              <FormattedMessage id={LEVEL_POPUP_GLOBAL.commissionNoteId} />
            </p>
          </div>
        </footer>
      </div>
    </Modal>
  );
};

export default AmbassadorLevelPopup;
