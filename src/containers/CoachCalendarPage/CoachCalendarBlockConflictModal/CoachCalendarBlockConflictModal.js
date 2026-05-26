import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';

import { FormattedMessage } from '../../../util/reactIntl';
import { Modal } from '../../../components';

import css from './CoachCalendarBlockConflictModal.module.css';

const MODAL_CONTENT_ID = 'CoachCalendarBlockConflictModal.content';

/**
 * Warning before blocking a day/range that overlaps active coach bookings.
 */
const CoachCalendarBlockConflictModal = props => {
  const {
    isOpen,
    onClose,
    onConfirm,
    conflicts,
    confirmInProgress,
    errorMessage,
    intl,
    onManageDisableScrolling,
  } = props;

  const disableScrolling =
    typeof onManageDisableScrolling === 'function' ? onManageDisableScrolling : () => {};

  const handleConfirmClick = event => {
    event.preventDefault();
    event.stopPropagation();
    // eslint-disable-next-line no-console
    console.log('[PeakUp BLOCK CANCEL BUTTON CLICK]', { confirmInProgress });

    if (confirmInProgress) {
      // eslint-disable-next-line no-console
      console.log('[PeakUp BLOCK CANCEL BUTTON CLICK] ignored — already in progress');
      return;
    }

    Promise.resolve(onConfirm()).catch(error => {
      // eslint-disable-next-line no-console
      console.error('[PeakUp BLOCK CANCEL SUBMIT FATAL]', error);
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      id="CoachCalendarBlockConflictModal"
      containerClassName={css.modal}
      contentClassName={css.container}
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={disableScrolling}
      usePortal
      closeButtonMessage={intl.formatMessage({
        id: 'CoachCalendarPage.blockConflictGoBack',
        defaultMessage: 'Go back',
      })}
    >
      <div id={MODAL_CONTENT_ID} className={css.inner}>
        <h2 className={css.title}>
          <FormattedMessage
            id="CoachCalendarPage.bookingWarningTitle"
            defaultMessage="You already have active sessions on this day."
          />
        </h2>
        <p className={css.description}>
          <FormattedMessage
            id="CoachCalendarPage.blockConflictModalDescription"
            defaultMessage="Blocking this period will affect existing bookings and notify the impacted customers."
          />
        </p>

        <div className={css.tableWrap}>
          <table className={css.sessionTable}>
            <thead>
              <tr>
                <th scope="col">
                  <FormattedMessage
                    id="CoachCalendarPage.blockConflictColCustomer"
                    defaultMessage="Customer"
                  />
                </th>
                <th scope="col">
                  <FormattedMessage
                    id="CoachCalendarPage.blockConflictColSession"
                    defaultMessage="Session"
                  />
                </th>
                <th scope="col">
                  <FormattedMessage
                    id="CoachCalendarPage.blockConflictColDate"
                    defaultMessage="Date"
                  />
                </th>
                <th scope="col">
                  <FormattedMessage
                    id="CoachCalendarPage.blockConflictColTime"
                    defaultMessage="Time"
                  />
                </th>
                <th scope="col">
                  <FormattedMessage
                    id="CoachCalendarPage.blockConflictColStatus"
                    defaultMessage="Status"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {conflicts.map(({ dateKey, session }) => (
                <tr key={`${session.transactionId}-${dateKey}`}>
                  <td>{session.customerName}</td>
                  <td>{session.sessionTitle || '—'}</td>
                  <td>
                    {intl.formatDate(new Date(`${dateKey}T12:00:00`), {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td>{session.timeLabel}</td>
                  <td>{session.statusLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={css.reliabilityWarning}>
          <FormattedMessage
            id="CoachCalendarPage.blockConflictReliabilityWarning"
            defaultMessage="Frequent cancellations may impact your coach reliability status."
          />
        </p>

        {errorMessage ? <p className={css.error}>{errorMessage}</p> : null}

        <div className={css.actions}>
          <button
            type="button"
            className={classNames(css.button, css.buttonSecondary)}
            onClick={onClose}
            disabled={confirmInProgress}
          >
            <FormattedMessage
              id="CoachCalendarPage.blockConflictGoBack"
              defaultMessage="Go back"
            />
          </button>
          <button
            type="button"
            className={classNames(css.button, css.buttonPrimary)}
            onClick={handleConfirmClick}
            disabled={confirmInProgress}
            aria-busy={confirmInProgress}
          >
            {confirmInProgress ? (
              <FormattedMessage
                id="CoachCalendarPage.blockConflictCancelInProgress"
                defaultMessage="Cancelling sessions…"
              />
            ) : (
              <FormattedMessage
                id="CoachCalendarPage.blockConflictConfirmAction"
                defaultMessage="Cancel affected sessions"
              />
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

CoachCalendarBlockConflictModal.defaultProps = {
  confirmInProgress: false,
  errorMessage: null,
  onManageDisableScrolling: null,
};

CoachCalendarBlockConflictModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  conflicts: PropTypes.arrayOf(
    PropTypes.shape({
      dateKey: PropTypes.string.isRequired,
      session: PropTypes.object.isRequired,
    })
  ).isRequired,
  confirmInProgress: PropTypes.bool,
  errorMessage: PropTypes.string,
  intl: PropTypes.object.isRequired,
  onManageDisableScrolling: PropTypes.func,
};

export default CoachCalendarBlockConflictModal;
