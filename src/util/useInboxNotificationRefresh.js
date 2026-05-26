import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { refreshInboxNotifications } from '../ducks/user.duck';
import {
  selectPlatformMode,
  selectPlatformModeHydrated,
} from '../ducks/peakupPlatformMode.duck';
import {
  canUseCoachPlatformMode,
  isCoachPlatformMode,
} from './peakupPlatformMode';

/** Poll interval — kept conservative to avoid Sharetribe 429 on messages/query. */
export const INBOX_NOTIFICATION_POLL_INTERVAL_MS = 60000;

/**
 * Keep inbox notification counts live for Topbar and coach dashboard surfaces.
 *
 * @param {{ enabled?: boolean, debugLabel?: string }} [options]
 */
const useInboxNotificationRefresh = (options = {}) => {
  const { enabled = true, debugLabel = 'app' } = options;
  const dispatch = useDispatch();
  const location = useLocation();
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUserId = useSelector(state => state.user?.currentUser?.id?.uuid);
  const currentUserSaleNotificationCount = useSelector(
    state => state.user?.currentUserSaleNotificationCount ?? 0
  );
  const currentUserOrderNotificationCount = useSelector(
    state => state.user?.currentUserOrderNotificationCount ?? 0
  );
  const currentUser = useSelector(state => state.user?.currentUser);
  const platformMode = useSelector(selectPlatformMode);
  const platformModeHydrated = useSelector(selectPlatformModeHydrated);
  const isCoachMode =
    platformModeHydrated &&
    canUseCoachPlatformMode(currentUser) &&
    isCoachPlatformMode(platformMode);
  const unreadCount = isCoachMode
    ? currentUserSaleNotificationCount
    : currentUserSaleNotificationCount + currentUserOrderNotificationCount;

  useEffect(() => {
    if (!enabled || !isAuthenticated || !currentUserId) {
      return undefined;
    }

    const refresh = () => {
      dispatch(refreshInboxNotifications());
    };

    refresh();

    const intervalId = window.setInterval(refresh, INBOX_NOTIFICATION_POLL_INTERVAL_MS);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, isAuthenticated, currentUserId, dispatch, location.pathname]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[PeakUp NOTIFICATION DEBUG]', {
      source: debugLabel,
      currentUserSaleNotificationCount,
      currentUserOrderNotificationCount,
      isCoachMode,
      unreadCount,
    });
  }, [
    enabled,
    debugLabel,
    currentUserSaleNotificationCount,
    currentUserOrderNotificationCount,
    isCoachMode,
    unreadCount,
  ]);
};

export default useInboxNotificationRefresh;
