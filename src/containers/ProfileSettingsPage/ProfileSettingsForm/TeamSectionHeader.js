import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { H4 } from '../../../components';

import css from './ProfileSettingsForm.module.css';

/**
 * PeakUp team workspace — section title + lead copy.
 *
 * @param {Object} props
 * @param {string} props.titleId - i18n id for section heading
 * @param {string} [props.infoId] - i18n id for section description
 * @param {string} [props.className]
 */
const TeamSectionHeader = props => {
  const { titleId, infoId, className, sectionNumber } = props;

  return (
    <header className={classNames(css.teamSectionHeader, className)}>
      {sectionNumber != null ? (
        <p className={css.teamSectionEyebrow} aria-hidden="true">
          <span className={css.teamSectionIndex}>
            {String(sectionNumber).padStart(2, '0')}
          </span>
        </p>
      ) : null}
      <H4 as="h2" className={css.teamSectionTitle}>
        <FormattedMessage id={titleId} />
      </H4>
      {infoId ? (
        <p className={css.teamSectionLead}>
          <FormattedMessage id={infoId} />
        </p>
      ) : null}
    </header>
  );
};

export default TeamSectionHeader;
