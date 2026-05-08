import React from 'react';

import { FieldLocationAutocompleteInput, HelpText } from '../../../components';
import { useIntl } from '../../../util/reactIntl';

import css from './FieldCoachMapLocation.module.css';

const identity = v => v;

/**
 * Single primary location field for coach profiles.
 *
 * The coach fills this field once: a Mapbox autocomplete that captures
 * "Where do you coach?". Everything downstream is derived from the
 * selected place:
 *
 *   - precise `lat` / `lng` for the map marker
 *   - full `location` object (address + bounds) for the popup / listing
 *     geocoding parity
 *   - short editorial label (e.g. "St. Moritz") for the figurina / coach
 *     card, derived via `derivePlaceShortLabel` and stored in
 *     `publicData.coachCityText` for back-compat and fast access
 *
 * See `publicDataPatchFromCoachMapLocation` (the form patcher) and
 * `getCoachShortLocationLabel` (the figurina renderer) for how the
 * derived values flow.
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
        rootClassName={css.helpText}
        helpText={intl.formatMessage({ id: 'FieldCoachMapLocation.helpText' })}
      />
    </div>
  );
};

export default FieldCoachMapLocation;
