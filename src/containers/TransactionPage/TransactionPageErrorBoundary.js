import React, { Component } from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import {
  getReadableErrorMessage,
  logPeakupTransactionFallbackError,
} from '../../util/errors';

import css from './TransactionPage.module.css';

/**
 * Catches render errors on TransactionPage (e.g. missing listing entity) so canceled
 * bookings still show a readable fallback instead of a white-screen overlay.
 */
class TransactionPageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: getReadableErrorMessage(error),
    };
  }

  componentDidCatch(error, errorInfo) {
    logPeakupTransactionFallbackError(error, {
      phase: 'TransactionPageErrorBoundary',
      componentStack: errorInfo?.componentStack,
    });
  }

  render() {
    const { hasError, errorMessage } = this.state;
    if (!hasError) {
      return this.props.children;
    }

    return (
      <div className={css.errorBoundaryFallback} role="alert">
        <p className={css.errorBoundaryTitle}>
          <FormattedMessage id="TransactionPage.unavailableBookingFallback" />
        </p>
        {errorMessage ? <p className={css.errorBoundaryDetail}>{errorMessage}</p> : null}
      </div>
    );
  }
}

export default TransactionPageErrorBoundary;
