import React from 'react';

import { FieldLocationAutocompleteInput, HelpText } from '../../../components';
import { useIntl } from '../../../util/reactIntl';
import { isValidTeamMapLocationFieldValue } from '../../../util/teamMapLocationForm';

import css from './FieldCoachMapLocation.module.css';

const identity = v => v;

/**
 * Geocoded crew base for team accounts (map pin + hero location).
 *
 * @param {Object} props
 * @param {string} [props.formId]
 */
const FieldTeamMapLocation = props => {
  const { formId } = props;
  const intl = useIntl();
  const id = formId ? `${formId}.pub_teamMapLocation` : 'pub_teamMapLocation';

  const validate = value => {
    if (isValidTeamMapLocationFieldValue(value)) {
      return undefined;
    }
    return intl.formatMessage({ id: 'FieldTeamMapLocation.required' });
  };

  return (
    <div className={css.root}>
      <FieldLocationAutocompleteInput
        className={css.field}
        rootClassName={css.locationRoot}
        inputClassName={css.locationInput}
        iconClassName={css.locationIcon}
        predictionsClassName={css.predictionsRoot}
        validClassName={css.validLocation}
        name="pub_teamMapLocation"
        id={id}
        label={intl.formatMessage({ id: 'FieldTeamMapLocation.label' })}
        placeholder={intl.formatMessage({ id: 'FieldTeamMapLocation.placeholder' })}
        useDefaultPredictions={false}
        format={identity}
        useDarkText
        validate={validate}
      />
      <HelpText
        rootClassName={css.helpText}
        helpText={intl.formatMessage({ id: 'FieldTeamMapLocation.helpText' })}
      />
    </div>
  );
};

export default FieldTeamMapLocation;
