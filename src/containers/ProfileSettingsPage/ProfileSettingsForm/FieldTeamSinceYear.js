import React, { useMemo } from 'react';

import { FieldSelect } from '../../../components';
import { useIntl } from '../../../util/reactIntl';

import css from './FieldTeamHeroMeta.module.css';

const YEAR_FLOOR = 1950;

/**
 * Year options for team "Since" metadata (current year → 1950).
 *
 * @returns {{ value: string, label: string }[]}
 */
export const buildTeamSinceYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= YEAR_FLOOR; year -= 1) {
    years.push({ value: String(year), label: String(year) });
  }
  return years;
};

/**
 * Compact year select for team crew identity (hero metadata, not a full form row).
 *
 * @param {Object} props
 * @param {string} [props.formId]
 */
const FieldTeamSinceYear = props => {
  const { formId, profileLayout = false } = props;
  const intl = useIntl();
  const id = formId ? `${formId}.pub_teamFoundedYear` : 'pub_teamFoundedYear';
  const years = useMemo(() => buildTeamSinceYearOptions(), []);

  return (
    <FieldSelect
      id={id}
      name="pub_teamFoundedYear"
      rootClassName={profileLayout ? css.rootWide : css.root}
      selectClassName={profileLayout ? css.selectProfile : css.selectCompact}
      labelClassName={css.label}
      label={intl.formatMessage({ id: 'ProfileSettingsForm.teamSinceYearLabel' })}
    >
      <option value="">
        {intl.formatMessage({ id: 'ProfileSettingsForm.teamSinceYearEmptyOption' })}
      </option>
      {years.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </FieldSelect>
  );
};

export default FieldTeamSinceYear;
