import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { manageDisableScrolling } from '../../ducks/ui.duck';

import Modal from '../Modal/Modal';
import modalCss from '../Modal/Modal.module.css';

import css from './PeakupCoachBadgesHierarchyModal.module.css';
import watermarkLogo from '../../assets/512X512_tm.png';

/** Righe gerarchia: id badge (classe CSS) + chiave etichetta = PeakUpCoachFigurineCard.badge.* */
const BADGE_HIERARCHY_ROWS = [
  {
    tier: 'founder',
    labelId: 'PeakUpCoachFigurineCard.badge.founder',
    labelDefault: 'Founder',
    bodyId: 'PeakupCoachBadgesHierarchyModal.founderBody',
    bodyDefault:
      'Original creator of PeakUp Sports. Exclusive highest-level badge.',
  },
  {
    tier: 'ambassador',
    labelId: 'PeakUpCoachFigurineCard.badge.ambassador',
    labelDefault: 'Ambassador',
    bodyId: 'PeakupCoachBadgesHierarchyModal.ambassadorBody',
    bodyDefault:
      'Early coaches helping grow the PeakUp community and platform.',
  },
  {
    tier: 'top_coach',
    labelId: 'PeakUpCoachFigurineCard.badge.topCoach',
    labelDefault: 'Top coach',
    bodyId: 'PeakupCoachBadgesHierarchyModal.topCoachBody',
    bodyDefault:
      'Verified coach with 10+ years of certified experience.',
  },
  {
    tier: 'certified_coach',
    labelId: 'PeakUpCoachFigurineCard.badge.certifiedCoach',
    labelDefault: 'Certified coach',
    bodyId: 'PeakupCoachBadgesHierarchyModal.certifiedBody',
    bodyDefault:
      'Verified and qualified coach with recognized certifications.',
  },
];

/**
 * Modale informativa: gerarchia PeakUp Sports Coach Badges (Founder → Certified).
 * Usare un `id` univoco per istanza (es. suffisso uuid profilo) così lo scroll lock Redux
 * non collide tra più card in carosello.
 *
 * @param {Object} props
 * @param {string} props.id identificativo unico per manageDisableScrolling
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 */
const PeakupCoachBadgesHierarchyModal = ({ id, isOpen, onClose }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const onManageDisableScrolling = useCallback(
    (componentId, disableScrolling) => {
      dispatch(manageDisableScrolling(componentId, disableScrolling));
    },
    [dispatch]
  );

  return (
    <Modal
      id={id}
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal
      lightCloseButton
      containerClassName={classNames(modalCss.container, css.modalContainerNarrow)}
    >
      <div className={css.body}>
        <div
          className={css.watermark}
          style={{ backgroundImage: `url(${watermarkLogo})` }}
          aria-hidden
        />
        <h2 className={css.title}>
          <FormattedMessage
            id="PeakupCoachBadgesHierarchyModal.title"
            defaultMessage="PeakUp Sports Coach Badges"
          />
        </h2>

        {BADGE_HIERARCHY_ROWS.map(row => (
          <section key={row.tier} className={css.tier}>
            <div className={css.tierHeader}>
              <strong className={css.tierName}>
                {intl.formatMessage({ id: row.labelId, defaultMessage: row.labelDefault })}
              </strong>
            </div>
            <p className={css.tierBody}>
              <FormattedMessage id={row.bodyId} defaultMessage={row.bodyDefault} />
            </p>
          </section>
        ))}
      </div>
    </Modal>
  );
};

export default PeakupCoachBadgesHierarchyModal;
