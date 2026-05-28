import React from 'react';

import { FieldSelect } from '../../../components';
import { useIntl } from '../../../util/reactIntl';
import { TEAM_SPORT_OPTIONS } from '../../../config/configPeakUpTeamUserFields';

import css from './FieldTeamHeroMeta.module.css';

/**
 * Compact main-sport select for team crew identity (V1: single primary sport → `teamSports[0]`).
 *
 * @param {Object} props
 * @param {string} [props.formId]
 */
const FieldTeamMainSport = props => {
  const { formId } = props;
  const intl = useIntl();
  const id = formId ? `${formId}.pub_teamMainSport` : 'pub_teamMainSport';

  return (
    <FieldSelect
      id={id}
      name="pub_teamMainSport"
      rootClassName={css.rootSport}
      selectClassName={css.select}
      labelClassName={css.label}
      label={intl.formatMessage({ id: 'ProfileSettingsForm.teamMainSportLabel' })}
    >
      <option value="">
        {intl.formatMessage({ id: 'ProfileSettingsForm.teamMainSportEmptyOption' })}
      </option>
      {TEAM_SPORT_OPTIONS.map(({ option, label }) => (
        <option key={option} value={option}>
          {label}
        </option>
      ))}
    </FieldSelect>
  );
};

export default FieldTeamMainSport;
