import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../../util/reactIntl';
import { getDefaultTimeZoneOnBrowser } from '../../../../util/dates';
import { LISTING_STATE_DRAFT } from '../../../../util/types';
import { isFullDay } from '../../../../transactions/transaction';
import {
  buildCoachCalendarFromListingWizardSearch,
  hasValidSharetribeAvailabilityPlan,
  isCoachCalendarConnectedFromSearch,
} from '../../../../util/coachCalendarListingBridge';
import { isCoachCalendarCompatibleListing } from '../../../../util/coachCalendarListingCompatibility';
import { persistCoachCalendarSyncTargetIfCompatible } from '../../../../util/coachCalendarAllListingsSync';
import {
  loadCoachCalendarDaySettings,
  saveListingWizardReturnContext,
} from '../../../../util/coachCalendarStorage';
import {
  createSharetribeAvailabilityFromCoachCalendar,
  syncCoachCalendarExceptions,
} from '../../../../util/coachCalendarSharetribeSync';

import { Button, H3, ListingLink } from '../../../../components';
import { pathByRouteName } from '../../../../util/routes';

import css from './EditListingAvailabilityPanel.module.css';

const defaultTimeZone = () =>
  typeof window !== 'undefined' ? getDefaultTimeZoneOnBrowser() : 'Etc/UTC';

/**
 * Listing wizard availability step — PeakUp Coach Calendar only (Sharetribe editor hidden).
 */
const EditListingAvailabilityPanel = props => {
  const {
    className,
    rootClassName,
    params,
    locationSearch,
    listing,
    listingTypes,
    onAddAvailabilityException,
    onDeleteAvailabilityException,
    onFetchAllAvailabilityExceptions,
    disabled,
    onSubmit,
    onNextTab,
    submitButtonText,
    errors,
    config,
    routeConfiguration,
    history,
    updatePageTitle: UpdatePageTitle,
    intl,
  } = props;

  const [planBootstrapInProgress, setPlanBootstrapInProgress] = useState(false);
  const [planBootstrapFailed, setPlanBootstrapFailed] = useState(false);
  const [planBootstrapComplete, setPlanBootstrapComplete] = useState(false);
  const planBootstrapAttemptedRef = useRef(false);

  const classes = classNames(rootClassName || css.root, className);
  const listingAttributes = listing?.attributes;
  const { unitType } = listingAttributes?.publicData || {};
  const useFullDays = isFullDay(unitType);

  const hasValidAvailabilityPlan = hasValidSharetribeAvailabilityPlan(
    listingAttributes?.availabilityPlan
  );
  const coachCalendarConnected = isCoachCalendarConnectedFromSearch(locationSearch);
  const canProceedPastAvailability = hasValidAvailabilityPlan || planBootstrapComplete;

  const handleOpenCoachCalendar = () => {
    const slug = params?.slug || 'draft';
    const tab = params?.tab || 'availability';
    const returnContext = {
      slug,
      id: params?.id,
      type: params?.type,
      tab,
      useFullDays,
    };

    if (returnContext.id && returnContext.type) {
      saveListingWizardReturnContext(returnContext);
      persistCoachCalendarSyncTargetIfCompatible({ listing, returnContext });
      const search = buildCoachCalendarFromListingWizardSearch(
        { slug, id: returnContext.id, type: returnContext.type, tab },
        { useFullDays }
      );
      const pathname = pathByRouteName('CoachCalendarPage', routeConfiguration);
      history.push(search ? `${pathname}?${search}` : pathname);
    }
  };

  const isPublished = listing?.id && listingAttributes?.state !== LISTING_STATE_DRAFT;

  useEffect(() => {
    if (coachCalendarConnected && hasValidAvailabilityPlan) {
      setPlanBootstrapComplete(true);
    }
  }, [coachCalendarConnected, hasValidAvailabilityPlan]);

  useEffect(() => {
    if (
      planBootstrapAttemptedRef.current ||
      !coachCalendarConnected ||
      hasValidAvailabilityPlan ||
      planBootstrapComplete ||
      isPublished ||
      !listing?.id ||
      disabled
    ) {
      return;
    }

    planBootstrapAttemptedRef.current = true;
    setPlanBootstrapInProgress(true);
    setPlanBootstrapFailed(false);

    const daySettings = loadCoachCalendarDaySettings() || {};
    const timezone = listingAttributes?.availabilityPlan?.timezone || defaultTimeZone();
    const { planPayload, exceptionParams } = createSharetribeAvailabilityFromCoachCalendar(
      daySettings,
      { timezone, useFullDays }
    );

    onSubmit(planPayload)
      .then(() =>
        syncCoachCalendarExceptions({
          listingId: listing.id,
          daySettings,
          timezone,
          exceptionParams,
          onAddAvailabilityException,
          onDeleteAvailabilityException,
          onFetchAllAvailabilityExceptions,
        })
      )
      .then(() => {
        if (isCoachCalendarCompatibleListing(listing)) {
          persistCoachCalendarSyncTargetIfCompatible({
            listing,
            returnContext: {
              slug: params?.slug || 'draft',
              id: listing.id?.uuid || listing.id,
              type: params?.type || 'draft',
              tab: params?.tab || 'availability',
              useFullDays,
            },
          });
        }
        setPlanBootstrapComplete(true);
      })
      .catch(() => {
        setPlanBootstrapFailed(true);
        planBootstrapAttemptedRef.current = false;
      })
      .finally(() => {
        setPlanBootstrapInProgress(false);
      });
  }, [
    coachCalendarConnected,
    disabled,
    hasValidAvailabilityPlan,
    isPublished,
    listing?.id,
    onAddAvailabilityException,
    onDeleteAvailabilityException,
    onFetchAllAvailabilityExceptions,
    onSubmit,
    planBootstrapComplete,
    useFullDays,
  ]);

  const panelHeadingProps = isPublished
    ? {
        id: 'EditListingAvailabilityPanel.title',
        values: { listingTitle: <ListingLink listing={listing} />, lineBreak: <br /> },
        messageProps: { listingTitle: listing.attributes.title },
      }
    : {
        id: 'EditListingAvailabilityPanel.createListingTitle',
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

      <section className={css.coachCalendarEntry} aria-labelledby="coach-calendar-entry-heading">
        <p className={css.coachCalendarHelper} id="coach-calendar-entry-heading">
          <FormattedMessage id="EditListingAvailabilityPanel.coachCalendarControlsHelper" />
        </p>
        {coachCalendarConnected && canProceedPastAvailability ? (
          <p className={css.coachCalendarConnected} role="status">
            <FormattedMessage id="EditListingAvailabilityPanel.coachCalendarConnected" />
          </p>
        ) : null}
        {planBootstrapInProgress ? (
          <p className={css.coachCalendarBootstrapHint}>
            <FormattedMessage id="EditListingAvailabilityPanel.coachCalendarBootstrapInProgress" />
          </p>
        ) : null}
        {planBootstrapFailed ? (
          <p className={css.error}>
            <FormattedMessage id="EditListingAvailabilityPanel.coachCalendarBootstrapFailed" />
          </p>
        ) : null}
        <Button className={css.coachCalendarCta} type="button" onClick={handleOpenCoachCalendar}>
          <FormattedMessage id="EditListingAvailabilityPanel.openCoachCalendar" />
        </Button>
      </section>

      {errors.showListingsError ? (
        <p className={css.error}>
          <FormattedMessage id="EditListingAvailabilityPanel.showListingFailed" />
        </p>
      ) : null}

      {!isPublished ? (
        <Button
          className={css.goToNextTabButton}
          onClick={onNextTab}
          disabled={!canProceedPastAvailability || planBootstrapInProgress}
        >
          {submitButtonText}
        </Button>
      ) : null}
    </main>
  );
};

export default EditListingAvailabilityPanel;
