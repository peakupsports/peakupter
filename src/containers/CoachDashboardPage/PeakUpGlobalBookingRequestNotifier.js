import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { useIntl } from '../../util/reactIntl';
import { matchPathname } from '../../util/routes';
import { filterTransactionsExcludingArchived } from '../../util/archivedConversations';
import {
  canShowBookingRequestPopup,
  markBookingRequestPopupSeen,
  pickNewBookingRequestForPopup,
} from '../../util/peakupBookingRequestPopup';
import { canUseCoachPlatformMode, isCoachPlatformMode } from '../../util/peakupPlatformMode';
import {
  selectPlatformMode,
  selectPlatformModeHydrated,
} from '../../ducks/peakupPlatformMode.duck';
import { manageDisableScrolling } from '../../ducks/ui.duck';

import NewBookingRequestModal from '../InboxPage/NewBookingRequestModal/NewBookingRequestModal';
import { fetchBookingRequestPopupSalesThunk } from './PeakUpGlobalBookingRequestNotifier.duck';

const NEW_BOOKING_REQUEST_MODAL_ID = 'NewBookingRequestModal';

const getRouteNameFromLocation = (pathname, routeConfiguration) => {
  const matchedRoutes = matchPathname(pathname, routeConfiguration);
  return matchedRoutes[0]?.route?.name ?? null;
};

/**
 * Coach-dashboard-only notifier for new provider booking requests.
 * Does not render on Inbox, transaction, or other operational pages.
 */
const PeakUpGlobalBookingRequestNotifier = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();

  const currentUser = useSelector(state => state.user?.currentUser);
  const saleNotificationCount = useSelector(
    state => state.user?.currentUserSaleNotificationCount ?? 0
  );
  const platformMode = useSelector(selectPlatformMode);
  const platformModeHydrated = useSelector(selectPlatformModeHydrated);

  const canSwitchPlatformMode = canUseCoachPlatformMode(currentUser);
  const isCoachMode =
    canSwitchPlatformMode && platformModeHydrated && isCoachPlatformMode(platformMode);

  const routeName = useMemo(
    () => getRouteNameFromLocation(location.pathname, routeConfiguration),
    [location.pathname, routeConfiguration]
  );

  const shouldAttemptPopup = canShowBookingRequestPopup({
    routeName,
    isCoachMode,
    saleNotificationCount,
  });

  const [popupTransaction, setPopupTransaction] = useState(null);

  const handleCloseBookingPopup = useCallback(() => {
    const userId = currentUser?.id?.uuid;
    const txId = popupTransaction?.id?.uuid;
    if (userId && txId) {
      markBookingRequestPopupSeen(userId, txId);
    }
    setPopupTransaction(null);
  }, [currentUser, popupTransaction]);

  const onManageDisableScrolling = useCallback(
    (componentId, disableScrolling) => {
      dispatch(manageDisableScrolling(componentId, disableScrolling));
    },
    [dispatch]
  );

  useEffect(() => {
    if (!shouldAttemptPopup || !currentUser?.id?.uuid) {
      setPopupTransaction(null);
      return undefined;
    }

    let cancelled = false;
    let timer;

    dispatch(fetchBookingRequestPopupSalesThunk())
      .unwrap()
      .then(transactions => {
        if (cancelled) {
          return;
        }

        const inboxTransactions = filterTransactionsExcludingArchived(transactions, currentUser);
        const tx = pickNewBookingRequestForPopup(inboxTransactions, currentUser);
        if (!tx) {
          setPopupTransaction(null);
          return;
        }

        timer = window.setTimeout(() => {
          if (!cancelled) {
            setPopupTransaction(prev => (prev ? prev : tx));
          }
        }, 500);
      })
      .catch(() => {
        if (!cancelled) {
          setPopupTransaction(null);
        }
      });

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [shouldAttemptPopup, currentUser, saleNotificationCount, dispatch]);

  if (!shouldAttemptPopup) {
    return null;
  }

  return (
    <NewBookingRequestModal
      id={NEW_BOOKING_REQUEST_MODAL_ID}
      isOpen={Boolean(popupTransaction)}
      transaction={popupTransaction}
      onClose={handleCloseBookingPopup}
      onManageDisableScrolling={onManageDisableScrolling}
      intl={intl}
    />
  );
};

export default PeakUpGlobalBookingRequestNotifier;
