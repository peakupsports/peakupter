import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import { manageDisableScrolling } from '../../ducks/ui.duck';
import { getTierBadgeLabel, getTierStyleVars } from '../../util/coachTier';

import Modal from '../Modal/Modal';

import css from './PeakupCoachBadgesHierarchyModal.module.css';

/** Premium shield JPG assets for hierarchy modal rows. */
const BADGE_IMAGE_SRC = {
  founder: '/CoachPagePic/Badge_founder.jpg',
  ambassador: '/CoachPagePic/Badge_ambassador.jpg',
  top_coach: '/CoachPagePic/Badge_topcoach.jpg',
  certified_coach: '/CoachPagePic/Badge_certifiedcoach.jpg',
};

const BADGE_IMAGE_ALT = {
  founder: 'Founder badge',
  ambassador: 'Ambassador badge',
  top_coach: 'Top Pro badge',
  certified_coach: 'Certified badge',
};

/** Hierarchy rows: Founder → Ambassador → Top Pro → Certified (labels are English-only). */
const BADGE_HIERARCHY_ROWS = [
  {
    tier: 'founder',
    bodyId: 'PeakupCoachBadgesHierarchyModal.founderBody',
    bodyDefault:
      'Original creator of PeakUp Sports. Exclusive highest-level badge.',
  },
  {
    tier: 'ambassador',
    bodyId: 'PeakupCoachBadgesHierarchyModal.ambassadorBody',
    bodyDefault:
      'Early professionals helping grow the PeakUp community and platform.',
  },
  {
    tier: 'top_coach',
    bodyId: 'PeakupCoachBadgesHierarchyModal.topCoachBody',
    bodyDefault:
      'Higher recognition based on performance, reviews, experience and quality metrics.',
  },
  {
    tier: 'certified_coach',
    bodyId: 'PeakupCoachBadgesHierarchyModal.certifiedBody',
    bodyDefault:
      'Baseline trust badge for approved professionals with recognized certifications.',
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
      className={css.modal}
      scrollLayerClassName={css.scrollLayer}
      containerClassName={classNames(css.container, css.modalContainerNarrow)}
      contentClassName={css.content}
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal
      lightCloseButton
      closeOnOutsideClick
    >
      <div className={css.peakUpShell}>
        <div className={css.body}>
          <h2 className={css.title}>
            <FormattedMessage
              id="PeakupCoachBadgesHierarchyModal.title"
              defaultMessage="PeakUp professional badges"
            />
            <span className={css.titleAccent} aria-hidden />
          </h2>

          <div className={css.tierList}>
            {BADGE_HIERARCHY_ROWS.map(row => (
              <section
                key={row.tier}
                className={classNames(css.tierCard, css[`tierCard_${row.tier}`])}
                style={getTierStyleVars(row.tier)}
              >
                <div className={css.tierCardInner}>
                  <div className={css.emblemColumn}>
                    <div className={css.emblemPlateWrap}>
                      <span className={css.emblemGlow} aria-hidden />
                      <img
                        className={css.badgeImage}
                        src={BADGE_IMAGE_SRC[row.tier]}
                        alt={BADGE_IMAGE_ALT[row.tier]}
                        loading="lazy"
                        decoding="async"
                        draggable="false"
                      />
                    </div>
                    <span className={css.emblemRibbon}>{getTierBadgeLabel(row.tier)}</span>
                  </div>
                  <span className={css.tierDivider} aria-hidden />
                  <div className={css.tierContent}>
                    <strong className={css.tierName}>{getTierBadgeLabel(row.tier)}</strong>
                    <p className={css.tierBody}>
                      <FormattedMessage id={row.bodyId} defaultMessage={row.bodyDefault} />
                    </p>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <p className={css.footerNote}>
            <FormattedMessage
              id="PeakupCoachBadgesHierarchyModal.footerNote"
              defaultMessage="Badges represent experience, trust and impact in the PeakUp community."
            />
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default PeakupCoachBadgesHierarchyModal;
