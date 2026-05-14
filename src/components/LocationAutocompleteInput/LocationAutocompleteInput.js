import React from 'react';
import { Field } from 'react-final-form';
import { ValidationError } from '../../components';

// Eager import: a loadable split here caused hero / SearchCTA layout shift on mobile when the
// geocoder chunk arrived ~1–2s after first paint. Mapbox/Google code stays in the main client
// graph for any route that imports `LocationAutocompleteInput` from `components`.
import LocationAutocompleteInputImpl from './LocationAutocompleteInputImpl';

/**
 * LocationAutocompleteInput component.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string?} props.labelClassName
 * @param {string?} props.label
 * @param {boolean} props.hideErrorMessage
 * @param {Object} props.input
 * @param {string} props.input.name
 * @param {Function} props.input.onChange
 * @param {Object} props.meta
 * @returns {JSX.Element} arrow head icon
 */
const LocationAutocompleteInputComponent = props => {
  const { rootClassName, labelClassName, hideErrorMessage, ...restProps } = props;
  const { input, label, meta, valueFromForm, ...otherProps } = restProps;

  const value = typeof valueFromForm !== 'undefined' ? valueFromForm : input.value;
  const locationAutocompleteProps = { label, meta, ...otherProps, input: { ...input, value } };
  const labelInfo = label ? (
    <label className={labelClassName} htmlFor={props.id}>
      {label}
    </label>
  ) : null;

  return (
    <div className={rootClassName}>
      {labelInfo}
      <LocationAutocompleteInputImpl {...locationAutocompleteProps} />
      {hideErrorMessage ? null : <ValidationError fieldMeta={meta} />}
    </div>
  );
};

export default LocationAutocompleteInputImpl;

export const FieldLocationAutocompleteInput = props => {
  return <Field component={LocationAutocompleteInputComponent} {...props} />;
};
