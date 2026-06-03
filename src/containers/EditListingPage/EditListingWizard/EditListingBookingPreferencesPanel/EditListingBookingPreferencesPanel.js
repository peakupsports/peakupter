import React from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage } from '../../../../util/reactIntl';
import { LISTING_STATE_DRAFT } from '../../../../util/types';
import {
  parsePeakUpBookingPreferencesFormFields,
  serializePeakUpBookingPreferencesFormFields,
} from '../../../../util/peakUpBookingPreferences';

// Import shared components
import { H3, ListingLink } from '../../../../components';

// Import modules from this directory
import EditListingBookingPreferencesForm from './EditListingBookingPreferencesForm';
import css from './EditListingBookingPreferencesPanel.module.css';

const getInitialValues = listing => {
  const { publicData } = listing?.attributes || {};
  return parsePeakUpBookingPreferencesFormFields(publicData);
};

/**
 * Booking preferences panel for the listing wizard (default-booking only).
 *
 * @component
 */
const EditListingBookingPreferencesPanel = props => {
  const {
    className,
    rootClassName,
    errors,
    disabled,
    ready,
    listing,
    submitButtonText,
    panelUpdated,
    updateInProgress,
    onSubmit,
    updatePageTitle: UpdatePageTitle,
    intl,
  } = props;

  const rootClass = rootClassName || css.root;
  const classes = classNames(rootClass, className);
  const isPublished = listing?.id && listing?.attributes?.state !== LISTING_STATE_DRAFT;

  const panelHeadingProps = isPublished
    ? {
        id: 'EditListingBookingPreferencesPanel.title',
        values: { listingTitle: <ListingLink listing={listing} />, lineBreak: <br /> },
        messageProps: { listingTitle: listing.attributes.title },
      }
    : {
        id: 'EditListingBookingPreferencesPanel.createListingTitle',
        values: { lineBreak: <br /> },
        messageProps: {},
      };

  return (
    <main className={classes}>
      <UpdatePageTitle
        panelHeading={intl.formatMessage(
          { id: panelHeadingProps.id },
          { ...panelHeadingProps.messageProps }
        )}
      />
      <H3 as="h1">
        <FormattedMessage id={panelHeadingProps.id} values={{ ...panelHeadingProps.values }} />
      </H3>
      <EditListingBookingPreferencesForm
        className={css.form}
        disabled={disabled}
        ready={ready}
        fetchErrors={errors}
        initialValues={getInitialValues(listing)}
        onSubmit={values => {
          const bookingPreferences = serializePeakUpBookingPreferencesFormFields(values);
          onSubmit({
            publicData: bookingPreferences,
          });
        }}
        saveActionMsg={submitButtonText}
        updated={panelUpdated}
        updateInProgress={updateInProgress}
      />
    </main>
  );
};

export default EditListingBookingPreferencesPanel;
