import React from 'react';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { NamedRedirect } from '../../components';
import { isPeakUpHqAdmin } from '../../util/peakupAdmin';

/**
 * Restricts PeakUp HQ routes to authenticated marketplace admins.
 *
 * @param {{ children: React.ReactNode }} props
 */
const PeakUpHqAdminGate = ({ children }) => {
  const config = useConfiguration();
  const currentUser = useSelector(state => state.user.currentUser);

  if (!isPeakUpHqAdmin(currentUser, config)) {
    return <NamedRedirect name="LandingPage" />;
  }

  return children;
};

export default PeakUpHqAdminGate;
