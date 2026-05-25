import { createAsyncThunk } from '@reduxjs/toolkit';

import { denormalisedResponseEntities } from '../../util/data';
import { storableError } from '../../util/errors';
import { getSupportedProcessesInfo } from '../../transactions/transaction';

const BOOKING_POPUP_SALES_PAGE_SIZE = 25;

export const fetchBookingRequestPopupSalesThunk = createAsyncThunk(
  'PeakUpGlobalBookingRequestNotifier/fetchSales',
  (_, { extra: sdk, rejectWithValue }) => {
    const processNames = getSupportedProcessesInfo().map(p => p.name);

    return sdk.transactions
      .query({
        only: 'sale',
        processNames,
        page: 1,
        perPage: BOOKING_POPUP_SALES_PAGE_SIZE,
        include: ['listing', 'provider', 'customer', 'booking'],
        'fields.transaction': [
          'processName',
          'lastTransition',
          'lastTransitionedAt',
          'transitions',
          'protectedData',
        ],
        'fields.listing': ['title', 'availabilityPlan', 'publicData.listingType'],
        'fields.user': ['profile.displayName', 'profile.abbreviatedName', 'deleted', 'banned'],
        sort: 'lastTransitionedAt',
      })
      .then(response => denormalisedResponseEntities(response))
      .catch(e => rejectWithValue(storableError(e)));
  }
);
