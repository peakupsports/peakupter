import React from 'react';
import { Field } from 'react-final-form';
import { FieldArray } from 'react-final-form-arrays';

import {
  FieldLocationAutocompleteInput,
  FieldTextInput,
  InlineTextButton,
  SecondaryButton,
} from '../../../components';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { createEmptyPreferredMeetingPointFormRow } from '../../../util/preferredMeetingPoints';

import css from './FieldPreferredMeetingPoints.module.css';

const identity = v => v;

/**
 * @param {Object} props
 * @param {string} props.name FieldArray member name (e.g. `preferredMeetingPoints[0]`)
 * @param {number} props.index
 * @param {Object} props.fields react-final-form-arrays fields API
 * @param {string} [props.formId]
 */
const MeetingPointRow = props => {
  const { name, index, fields, formId } = props;
  const intl = useIntl();
  const idPrefix = formId ? `${formId}.${name}` : name;

  return (
    <div className={css.row}>
      <div className={css.rowHeader}>
        <p className={css.rowTitle}>
          <FormattedMessage
            id="FieldPreferredMeetingPoints.rowTitle"
            values={{ number: index + 1 }}
          />
        </p>
        <InlineTextButton
          type="button"
          className={css.removeButton}
          onClick={() => fields.remove(index)}
        >
          <FormattedMessage id="FieldPreferredMeetingPoints.removeButton" />
        </InlineTextButton>
      </div>
      <Field name={`${name}.id`} component="input" type="hidden" />
      <FieldTextInput
        className={css.labelField}
        id={`${idPrefix}.label`}
        name={`${name}.label`}
        label={intl.formatMessage({ id: 'FieldPreferredMeetingPoints.labelName' })}
        placeholder={intl.formatMessage({
          id: 'FieldPreferredMeetingPoints.placeholderLabel',
        })}
      />
      <div className={css.locationWrap}>
        <FieldLocationAutocompleteInput
          className={css.locationField}
          rootClassName={css.locationRoot}
          inputClassName={css.locationInput}
          iconClassName={css.locationIcon}
          predictionsClassName={css.predictionsRoot}
          validClassName={css.validLocation}
          name={`${name}.location`}
          id={`${idPrefix}.location`}
          label={intl.formatMessage({ id: 'FieldPreferredMeetingPoints.labelAddress' })}
          placeholder={intl.formatMessage({
            id: 'FieldPreferredMeetingPoints.placeholderAddress',
          })}
          useDefaultPredictions={false}
          format={identity}
          useDarkText
        />
      </div>
      <FieldTextInput
        className={css.notesField}
        type="textarea"
        id={`${idPrefix}.notes`}
        name={`${name}.notes`}
        label={intl.formatMessage({ id: 'FieldPreferredMeetingPoints.labelNotes' })}
        placeholder={intl.formatMessage({
          id: 'FieldPreferredMeetingPoints.placeholderNotes',
        })}
      />
    </div>
  );
};

/**
 * Coach-only list of usual client meeting points (saved to `publicData.preferredMeetingPoints`).
 *
 * @param {Object} props
 * @param {string} [props.formId]
 */
const FieldPreferredMeetingPoints = props => {
  const { formId } = props;

  return (
    <FieldArray name="preferredMeetingPoints">
      {({ fields }) => {
        const hasRows = fields.length > 0;
        return (
          <>
            {hasRows ? (
              <div className={css.list}>
                {fields.map((name, index) => (
                  <MeetingPointRow
                    key={fields.value?.[index]?.id || name}
                    name={name}
                    index={index}
                    fields={fields}
                    formId={formId}
                  />
                ))}
              </div>
            ) : (
              <p className={css.emptyHint}>
                <FormattedMessage id="FieldPreferredMeetingPoints.emptyHint" />
              </p>
            )}
            <SecondaryButton
              type="button"
              className={css.addButton}
              onClick={() => fields.push(createEmptyPreferredMeetingPointFormRow())}
            >
              <FormattedMessage id="FieldPreferredMeetingPoints.addButton" />
            </SecondaryButton>
          </>
        );
      }}
    </FieldArray>
  );
};

export default FieldPreferredMeetingPoints;
