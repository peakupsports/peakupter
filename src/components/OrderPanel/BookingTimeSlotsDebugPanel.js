import React from 'react';
import classNames from 'classnames';

import { isBookingSlotsDebugEnabled } from '../../util/bookingSlotsDebug';
import css from './BookingTimeSlotsDebugPanel.module.css';

/**
 * Visible dev-only debug for booking start-time pipeline (Sharetribe vs frontend).
 *
 * @param {Object} props
 * @param {Object|null} props.snapshot
 * @param {string} [props.className]
 */
const BookingTimeSlotsDebugPanel = ({ snapshot, className }) => {
  if (!isBookingSlotsDebugEnabled() || !snapshot) {
    return null;
  }

  const diagnosis = snapshot.reduxLookupMismatch
    ? 'SDK returned slots but Redux lookup is empty (dateKey mismatch).'
    : snapshot.dayFilterMismatch
      ? 'Redux has slots but none match selected day (timezone/date filter).'
      : snapshot.lastTimeslotsResponseCount === 0
        ? 'SDK timeslots.query returned 0 (query range / listing availability).'
        : null;

  return (
    <section
      className={classNames(css.root, className)}
      aria-label="Booking time slots debug"
    >
      <p className={css.title}>Booking time slots debug ({snapshot.selectedDate || '—'})</p>
      {snapshot.fetchTimeSlotsInProgress ? (
        <p className={css.status}>Fetching date-specific timeSlots…</p>
      ) : null}
      {!snapshot.fetchTimeSlotsInProgress && !snapshot.hasFetchedDateTimeSlots ? (
        <p className={css.status}>Date-specific timeSlots not fetched yet (using monthly cache).</p>
      ) : null}
      {diagnosis ? <p className={css.diagnosis}>{diagnosis}</p> : null}

      <p className={css.sectionTitle}>Fetch / Redux lookup</p>
      <dl className={css.list}>
        <div className={css.row}>
          <dt>lookupDateKey</dt>
          <dd>{snapshot.lookupDateKey ?? '—'}</dd>
        </div>
        <div className={css.row}>
          <dt>timeSlotsForDateKeys</dt>
          <dd>
            {snapshot.timeSlotsForDateKeys?.length
              ? snapshot.timeSlotsForDateKeys.join(', ')
              : '—'}
          </dd>
        </div>
        <div className={css.row}>
          <dt>fetchTimeSlotsInProgress</dt>
          <dd>{String(snapshot.fetchTimeSlotsInProgress)}</dd>
        </div>
        <div className={css.row}>
          <dt>hasFetchedDateTimeSlots</dt>
          <dd>{String(snapshot.hasFetchedDateTimeSlots)}</dd>
        </div>
        <div className={css.row}>
          <dt>fetchTimeSlotsError</dt>
          <dd>{snapshot.fetchTimeSlotsError || '—'}</dd>
        </div>
        <div className={css.row}>
          <dt>sdk.timeslots.query response count</dt>
          <dd>
            {snapshot.lastTimeslotsResponseCount != null
              ? snapshot.lastTimeslotsResponseCount
              : '—'}
          </dd>
        </div>
        <div className={css.row}>
          <dt>storedRawTimeSlotsCount (Redux lookup)</dt>
          <dd>{snapshot.storedRawTimeSlotsCount ?? '—'}</dd>
        </div>
      </dl>

      <p className={css.sectionTitle}>Last sdk.timeslots.query params</p>
      <dl className={css.list}>
        <div className={css.row}>
          <dt>listingId</dt>
          <dd>{snapshot.lastTimeslotsQuery?.listingId ?? '—'}</dd>
        </div>
        <div className={css.row}>
          <dt>start</dt>
          <dd>{snapshot.lastTimeslotsQuery?.start ?? '—'}</dd>
        </div>
        <div className={css.row}>
          <dt>end</dt>
          <dd>{snapshot.lastTimeslotsQuery?.end ?? '—'}</dd>
        </div>
        <div className={css.row}>
          <dt>dateKey</dt>
          <dd>{snapshot.lastTimeslotsQuery?.dateKey ?? '—'}</dd>
        </div>
      </dl>

      <p className={css.sectionTitle}>Pipeline counts</p>
      <dl className={css.list}>
        <div className={css.row}>
          <dt>rawTimeSlotsOnSelectedDate.count</dt>
          <dd>{snapshot.rawTimeSlotsOnSelectedDateCount}</dd>
        </div>
        <div className={css.row}>
          <dt>preparedBookableIntervals.count</dt>
          <dd>{snapshot.preparedBookableIntervalsCount}</dd>
        </div>
        <div className={css.row}>
          <dt>timeSlotsUsedForStartTimes.count</dt>
          <dd>{snapshot.timeSlotsUsedForStartTimesCount}</dd>
        </div>
        <div className={css.row}>
          <dt>availableStartTimes.count</dt>
          <dd>{snapshot.availableStartTimesCount}</dd>
        </div>
      </dl>

      <p className={css.sectionTitle}>rawTimeSlots (first 20)</p>
      <pre className={css.pre}>{JSON.stringify(snapshot.rawTimeSlotsFirst20, null, 2)}</pre>

      {snapshot.rawTimeSlotsTruncated ? (
        <>
          <p className={css.sectionTitle}>rawTimeSlots (last 20)</p>
          <pre className={css.pre}>{JSON.stringify(snapshot.rawTimeSlotsLast20, null, 2)}</pre>
        </>
      ) : null}

      <p className={css.sectionTitle}>preparedBookableIntervals (seats &gt; 0, merged)</p>
      <pre className={css.pre}>{JSON.stringify(snapshot.preparedBookableIntervals, null, 2)}</pre>

      <p className={css.sectionTitle}>timeSlotsUsedForStartTimes</p>
      <pre className={css.pre}>{JSON.stringify(snapshot.timeSlotsUsedForStartTimes, null, 2)}</pre>

      <p className={css.sectionTitle}>availableStartTimes (dropdown)</p>
      <pre className={css.pre}>{JSON.stringify(snapshot.availableStartTimes, null, 2)}</pre>
    </section>
  );
};

export default BookingTimeSlotsDebugPanel;
