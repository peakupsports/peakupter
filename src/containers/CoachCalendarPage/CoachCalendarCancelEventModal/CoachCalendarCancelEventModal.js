import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';

import { FormattedMessage } from '../../../util/reactIntl';
import { Modal } from '../../../components';

import css from './CoachCalendarCancelEventModal.module.css';

const MODAL_CONTENT_ID = 'CoachCalendarCancelEventModal.content';

/**
 * Confirmation before a coach cancels a Multi-Day Experience event registration.
 */
const CoachCalendarCancelEventModal = props => {
  const {
    isOpen,
    onClose,
    onConfirm,
    session,
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

    if (confirmInProgress) {
      return;
    }

    Promise.resolve(onConfirm()).catch(error => {
      // eslint-disable-next-line no-console
      console.error('[PeakUp EVENT CANCEL SUBMIT FATAL]', error);
    });
  };

  if (!isOpen || !session) {
    return null;
  }

  return (
    <Modal
      id="CoachCalendarCancelEventModal"
      containerClassName={css.modal}
      contentClassName={css.container}
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={disableScrolling}
      usePortal
      closeButtonMessage={intl.formatMessage({
        id: 'CoachCalendarPage.cancelEventGoBack',
        defaultMessage: 'Go back',
      })}
    >
      <div id={MODAL_CONTENT_ID} className={css.inner}>
        <h2 className={css.title}>
          <FormattedMessage
            id="CoachCalendarPage.cancelEventTitle"
            defaultMessage="Cancel this event?"
          />
        </h2>
        <p className={css.description}>
          <FormattedMessage
            id="CoachCalendarPage.cancelEventDescription"
            defaultMessage="This will cancel the participant's registration, process any applicable refund according to PeakUp's cancellation policy, and notify them by message and email. The transaction history and inbox thread will be kept."
          />
        </p>

        <dl className={css.eventDetails}>
          <div className={css.detailRow}>
            <dt>
              <FormattedMessage
                id="CoachCalendarPage.cancelEventColEvent"
                defaultMessage="Event"
              />
            </dt>
            <dd>{session.sessionTitle || '—'}</dd>
          </div>
          <div className={css.detailRow}>
            <dt>
              <FormattedMessage
                id="CoachCalendarPage.cancelEventColParticipant"
                defaultMessage="Participant"
              />
            </dt>
            <dd>{session.customerName}</dd>
          </div>
          {session.dateRangeLabel ? (
            <div className={css.detailRow}>
              <dt>
                <FormattedMessage
                  id="CoachCalendarPage.cancelEventColDates"
                  defaultMessage="Dates"
                />
              </dt>
              <dd>{session.dateRangeLabel}</dd>
            </div>
          ) : null}
          <div className={css.detailRow}>
            <dt>
              <FormattedMessage
                id="CoachCalendarPage.cancelEventColStatus"
                defaultMessage="Status"
              />
            </dt>
            <dd>{session.statusLabel}</dd>
          </div>
        </dl>

        <p className={css.reliabilityWarning}>
          <FormattedMessage
            id="CoachCalendarPage.cancelEventReliabilityWarning"
            defaultMessage="Frequent cancellations may impact your reliability status."
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
              id="CoachCalendarPage.cancelEventGoBack"
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
                id="CoachCalendarPage.cancelEventInProgress"
                defaultMessage="Cancelling event…"
              />
            ) : (
              <FormattedMessage
                id="CoachCalendarPage.cancelEventConfirmAction"
                defaultMessage="Cancel event"
              />
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

CoachCalendarCancelEventModal.defaultProps = {
  confirmInProgress: false,
  errorMessage: null,
  onManageDisableScrolling: null,
  session: null,
};

CoachCalendarCancelEventModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  session: PropTypes.object,
  confirmInProgress: PropTypes.bool,
  errorMessage: PropTypes.string,
  intl: PropTypes.object.isRequired,
  onManageDisableScrolling: PropTypes.func,
};

export default CoachCalendarCancelEventModal;
