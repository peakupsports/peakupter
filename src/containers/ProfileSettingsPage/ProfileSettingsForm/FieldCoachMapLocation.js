import React from 'react';

import { FieldLocationAutocompleteInput, HelpText } from '../../../components';
import { useIntl } from '../../../util/reactIntl';

import css from './FieldCoachMapLocation.module.css';

const identity = v => v;

/**
 * Worldwide address search (Mapbox/Google) for coach profile map pin — same geocoder as listings.
 *
 * @param {Object} props
 * @param {string} [props.formId]
 */
const FieldCoachMapLocation = props => {
  const { formId } = props;
  const intl = useIntl();
  const id = formId ? `${formId}.pub_coachMapLocation` : 'pub_coachMapLocation';

  return (
    <div className={css.root}>
      <FieldLocationAutocompleteInput
        className={css.field}
        rootClassName={css.locationRoot}
        inputClassName={css.locationInput}
        iconClassName={css.locationIcon}
        predictionsClassName={css.predictionsRoot}
        validClassName={css.validLocation}
        name="pub_coachMapLocation"
        id={id}
        label={intl.formatMessage({ id: 'FieldCoachMapLocation.label' })}
        placeholder={intl.formatMessage({ id: 'FieldCoachMapLocation.placeholder' })}
        useDefaultPredictions={false}
        format={identity}
        useDarkText
      />
      <HelpText
        helpText={intl.formatMessage({ id: 'FieldCoachMapLocation.helpText' })}
      />
    </div>
  );
};

export default FieldCoachMapLocation;
