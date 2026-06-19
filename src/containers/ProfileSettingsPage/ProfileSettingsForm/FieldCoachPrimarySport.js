import React, { useCallback, useEffect, useRef } from 'react';
import { FormSpy } from 'react-final-form';

import { FieldSelect } from '../../../components';
import { useIntl } from '../../../util/reactIntl';
import { PEAKUP_SPORT_ENUM_OPTIONS } from '../../../config/configPeakUpCoachUserFields';
import {
  applyPrimarySportSelectionChange,
  normalizeCoachOfferedSportsFormValue,
  PUB_SPORTS_MANUAL_FIELD,
} from '../../../util/coachPrimarySport';
import { markPrimaryDrivenSportsUpdate } from '../../../util/coachPrimarySportFormSyncState';

import css from './FieldCoachPrimarySport.module.css';

const PUB_SPORTS_FIELD = 'pub_sports';
const PUB_PRIMARY_SPORT_FIELD = 'pub_primarySport';

/**
 * Keeps primary sport aligned when sports are changed from the checkbox list.
 */
const CoachPrimarySportSync = ({ form, offeredSports, primaryValue }) => {
  useEffect(() => {
    if (offeredSports.length === 0) {
      if (primaryValue) {
        form.change(PUB_PRIMARY_SPORT_FIELD, '');
      }
      return;
    }

    if (primaryValue && !offeredSports.includes(primaryValue)) {
      form.change(PUB_PRIMARY_SPORT_FIELD, offeredSports[0] || '');
    }
  }, [form, offeredSports, primaryValue]);

  return null;
};

const FieldCoachPrimarySportInner = ({ formId, offeredSports, primaryValue, form }) => {
  const intl = useIntl();
  const id = formId ? `${formId}.${PUB_PRIMARY_SPORT_FIELD}` : PUB_PRIMARY_SPORT_FIELD;

  const handlePrimarySportChange = useCallback(
    nextValue => {
      const manual = normalizeCoachOfferedSportsFormValue(
        form.getState().values?.[PUB_SPORTS_MANUAL_FIELD]
      );
      const { sports: nextSports } = applyPrimarySportSelectionChange({
        manual,
        nextPrimary: nextValue,
      });

      markPrimaryDrivenSportsUpdate(nextSports);
      form.change(PUB_SPORTS_FIELD, nextSports);
    },
    [form]
  );

  return (
    <>
      <CoachPrimarySportSync form={form} offeredSports={offeredSports} primaryValue={primaryValue} />
      <FieldSelect
        id={id}
        name={PUB_PRIMARY_SPORT_FIELD}
        className={css.root}
        onChange={handlePrimarySportChange}
        label={intl.formatMessage({ id: 'ProfileSettingsForm.coachPrimarySportLabel' })}
      >
        <option value="">
          {intl.formatMessage({ id: 'ProfileSettingsForm.coachPrimarySportEmptyOption' })}
        </option>
        {PEAKUP_SPORT_ENUM_OPTIONS.map(({ option, label }) => (
          <option key={option} value={option}>
            {label}
          </option>
        ))}
      </FieldSelect>
    </>
  );
};

/**
 * Primary sport select for coach/professional profiles (hero row).
 *
 * @param {Object} props
 * @param {string} [props.formId]
 */
const FieldCoachPrimarySport = props => {
  const { formId } = props;

  return (
    <FormSpy subscription={{ values: true }}>
      {({ values, form }) => (
        <FieldCoachPrimarySportInner
          formId={formId}
          form={form}
          offeredSports={normalizeCoachOfferedSportsFormValue(values?.[PUB_SPORTS_FIELD])}
          primaryValue={String(values?.[PUB_PRIMARY_SPORT_FIELD] || '').trim()}
        />
      )}
    </FormSpy>
  );
};

export default FieldCoachPrimarySport;
