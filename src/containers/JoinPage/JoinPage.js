import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { buildCoachSignupEntryPath, parseReferralCodeFromSearch } from '../../util/coachOnboarding';

/**
 * Short referral entry point — redirects /join?ref=CODE through coach signup onboarding.
 */
const JoinPage = () => {
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    const ref = parseReferralCodeFromSearch(location.search);
    history.replace(buildCoachSignupEntryPath({ ref }));
  }, [history, location.search]);

  return null;
};

export default JoinPage;
