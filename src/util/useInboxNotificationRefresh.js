import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { refreshInboxNotifications } from '../ducks/user.duck';

/** Poll interval — kept conservative to avoid Sharetribe 429 on messages/query. */
export const INBOX_NOTIFICATION_POLL_INTERVAL_MS = 60000;

/**
 * Keep inbox notification counts live for Topbar and coach dashboard surfaces.
 *
 * @param {{ enabled?: boolean }} [options]
 */
const useInboxNotificationRefresh = (options = {}) => {
  const { enabled = true } = options;
  const dispatch = useDispatch();
  const location = useLocation();
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUserId = useSelector(state => state.user?.currentUser?.id?.uuid);

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
};

export default useInboxNotificationRefresh;
