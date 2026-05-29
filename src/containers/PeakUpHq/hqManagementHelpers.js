import React from 'react';
import classNames from 'classnames';
import moment from 'moment';

import css from './PeakUpHqFeaturedCoachesPage/PeakUpHqFeaturedCoachesPage.module.css';

export const getInitials = displayName => {
  const parts = String(displayName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const sortByDisplayName = (a, b) =>
  String(a?.displayName || a?.teamName || '').localeCompare(
    String(b?.displayName || b?.teamName || ''),
    undefined,
    { sensitivity: 'base' }
  );

const compareValues = (a, b, direction = 'asc') => {
  if (a === b) {
    return 0;
  }
  if (a == null) {
    return 1;
  }
  if (b == null) {
    return -1;
  }
  const cmp = a < b ? -1 : 1;
  return direction === 'desc' ? -cmp : cmp;
};

export const sortCustomers = (customers, sortKey, direction = 'asc') => {
  const list = [...customers];
  list.sort((a, b) => {
    switch (sortKey) {
      case 'signup':
        return compareValues(
          a.signupAt ? new Date(a.signupAt).getTime() : 0,
          b.signupAt ? new Date(b.signupAt).getTime() : 0,
          direction
        );
      case 'bookings':
        return compareValues(a.bookingCount, b.bookingCount, direction);
      case 'activity':
        return compareValues(
          a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0,
          b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0,
          direction
        );
      case 'name':
      default:
        return direction === 'desc'
          ? sortByDisplayName(b, a)
          : sortByDisplayName(a, b);
    }
  });
  return list;
};

export const sortTeams = (teams, sortKey, direction = 'asc') => {
  const list = [...teams];
  list.sort((a, b) => {
    switch (sortKey) {
      case 'signup':
        return compareValues(
          a.signupAt ? new Date(a.signupAt).getTime() : 0,
          b.signupAt ? new Date(b.signupAt).getTime() : 0,
          direction
        );
      case 'coaches':
        return compareValues(a.coachCount, b.coachCount, direction);
      case 'sport':
        return compareValues(a.mainSport, b.mainSport, direction);
      case 'name':
      default:
        return direction === 'desc'
          ? sortByDisplayName(b, a)
          : sortByDisplayName(a, b);
    }
  });
  return list;
};

export const isNewCustomer = customer => {
  if (!customer?.signupAt) {
    return false;
  }
  return Date.now() - new Date(customer.signupAt).getTime() <= 30 * 24 * 60 * 60 * 1000;
};

export const isActiveCustomer = customer => {
  if (!customer?.lastBookingAt) {
    return false;
  }
  return Date.now() - new Date(customer.lastBookingAt).getTime() <= 90 * 24 * 60 * 60 * 1000;
};

export const customerHasBookings = customer => (customer?.bookingCount || 0) > 0;

export const AvatarCell = ({ displayName, imageUrl, className }) => (
  <div className={classNames(css.coachIdentityCompact, className)}>
    <div className={css.coachPhotoFrame}>
      {imageUrl ? (
        <img className={css.coachPhoto} src={imageUrl} alt="" loading="lazy" decoding="async" />
      ) : (
        <div className={css.coachPhotoFallback} aria-hidden>
          {getInitials(displayName)}
        </div>
      )}
    </div>
    <p className={css.coachName}>{displayName || '—'}</p>
  </div>
);

export const formatActivityDate = value => (value ? moment(value).format('D MMM YYYY') : '—');
