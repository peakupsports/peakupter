import React, { useCallback, useMemo } from 'react';

import { FieldSelect } from '../../../components';
import { useIntl } from '../../../util/reactIntl';
import { PEAKUP_SPORT_ENUM_OPTIONS } from '../../../config/configPeakUpCoachUserFields';
import { normalizeSportKey } from '../../../util/coachExplore';

import css from './FieldTeamHeroMeta.module.css';

const SPORT_OPTIONS = PEAKUP_SPORT_ENUM_OPTIONS;

/**
 * @param {'primary'|'secondary'} role
 */
const fieldConfigForRole = role => {
  if (role === 'secondary') {
    return {
      name: 'pub_teamSecondarySport',
      labelId: 'ProfileSettingsForm.teamSecondarySportLabel',
      emptyId: 'ProfileSettingsForm.teamSecondarySportEmptyOption',
    };
  }
  return {
    name: 'pub_teamPrimarySport',
    labelId: 'ProfileSettingsForm.teamPrimarySportLabel',
    emptyId: 'ProfileSettingsForm.teamPrimarySportEmptyOption',
  };
};

/**
 * Compact team identity sport select (primary or optional secondary).
 *
 * @param {Object} props
 * @param {'primary'|'secondary'} props.role
 * @param {string} [props.formId]
 */
const FieldTeamIdentitySport = props => {
  const { role, formId, profileLayout = false } = props;
  const intl = useIntl();
  const { name, labelId, emptyId } = fieldConfigForRole(role);
  const id = formId ? `${formId}.${name}` : name;

  const validateSecondary = useCallback(
    (value, allValues) => {
      if (role !== 'secondary') {
        return undefined;
      }
      const secondary = normalizeSportKey(String(value || '').trim());
      if (!secondary) {
        return undefined;
      }
      const primary = normalizeSportKey(String(allValues?.pub_teamPrimarySport || '').trim());
      if (primary && secondary === primary) {
        return intl.formatMessage({ id: 'ProfileSettingsForm.teamSecondarySportDuplicate' });
      }
      return undefined;
    },
    [intl, role]
  );

  const validateMaybe = role === 'secondary' ? { validate: validateSecondary } : {};

  const options = useMemo(() => SPORT_OPTIONS, []);

  return (
    <FieldSelect
      id={id}
      name={name}
      rootClassName={profileLayout ? css.rootSportWide : css.rootSport}
      selectClassName={profileLayout ? css.selectProfile : css.select}
      labelClassName={css.label}
      label={intl.formatMessage({ id: labelId })}
      {...validateMaybe}
    >
      <option value="">{intl.formatMessage({ id: emptyId })}</option>
      {options.map(({ option, label }) => (
        <option key={option} value={option}>
          {label}
        </option>
      ))}
    </FieldSelect>
  );
};

export const FieldTeamPrimarySport = props => (
  <FieldTeamIdentitySport {...props} role="primary" />
);

export const FieldTeamSecondarySport = props => (
  <FieldTeamIdentitySport {...props} role="secondary" />
);

export default FieldTeamIdentitySport;
