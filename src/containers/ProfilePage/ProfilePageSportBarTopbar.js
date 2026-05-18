import React, { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { SportBar } from '../../components';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { parseCoachExploreSearch } from '../../util/coachExplore';
import { createResourceLocatorString } from '../../util/routes';
import { parse } from '../../util/urlHelpers';

import topbarCss from '../TopbarContainer/Topbar/Topbar.module.css';

/**
 * PeakUp SportBar for the profile topbar center slot (customer member profiles).
 * Same component and styling as LandingPage / CoachesPage global topbar SportBar.
 */
const ProfilePageSportBarTopbar = () => {
  const history = useHistory();
  const location = useLocation();
  const routeConfiguration = useRouteConfiguration();

  const currentSportFromUrl = useMemo(
    () => parseCoachExploreSearch(location.search).sportKey || '',
    [location.search]
  );

  const handleChange = useCallback(
    next => {
      const params = parse(location.search);
      const merged = { ...params };
      if (next) {
        merged.sport = next;
      } else {
        delete merged.sport;
      }
      const to = createResourceLocatorString('CoachMapPage', routeConfiguration, {}, merged);
      history.push(to);
    },
    [history, location.search, routeConfiguration]
  );

  return (
    <div className={topbarCss.landingSportBarCenterScale}>
      <SportBar
        value={currentSportFromUrl}
        inTopbar
        onChange={handleChange}
        allLabel="All sports"
      />
    </div>
  );
};

export default ProfilePageSportBarTopbar;
