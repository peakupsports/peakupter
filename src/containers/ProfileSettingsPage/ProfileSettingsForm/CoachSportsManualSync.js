import React, { useEffect, useRef } from 'react';
import { FormSpy } from 'react-final-form';

import {
  PUB_SPORTS_MANUAL_FIELD,
  coachSportsListsEqual,
  normalizeCoachOfferedSportsFormValue,
  updateManualSportsFromCheckboxChange,
} from '../../../util/coachPrimarySport';
import {
  consumePrimaryDrivenSportsUpdate,
  markPrimaryDrivenSportsUpdate,
} from '../../../util/coachPrimarySportFormSyncState';

const PUB_SPORTS_FIELD = 'pub_sports';
const PUB_PRIMARY_SPORT_FIELD = 'pub_primarySport';

const CoachSportsManualSyncInner = ({ sports, manual, primary, form }) => {
  const prevSportsRef = useRef(sports);

  useEffect(() => {
    if (consumePrimaryDrivenSportsUpdate(sports)) {
      prevSportsRef.current = sports;
      return;
    }

    const previousSports = prevSportsRef.current;
    if (coachSportsListsEqual(previousSports, sports)) {
      return;
    }

    const { manual: nextManual, clearPrimary, reconciledSports } =
      updateManualSportsFromCheckboxChange({
        previousManual: manual,
        previousSports,
        nextSports: sports,
        primary,
      });

    if (!coachSportsListsEqual(nextManual, manual)) {
      form.change(PUB_SPORTS_MANUAL_FIELD, nextManual);
    }

    if (clearPrimary) {
      form.change(PUB_PRIMARY_SPORT_FIELD, '');
    }

    if (!coachSportsListsEqual(reconciledSports, sports)) {
      markPrimaryDrivenSportsUpdate(reconciledSports);
      form.change(PUB_SPORTS_FIELD, reconciledSports);
      prevSportsRef.current = reconciledSports;
      return;
    }

    prevSportsRef.current = sports;
  }, [form, manual, primary, sports]);

  return null;
};

/**
 * Keeps manual sports selections separate from auto-added Primary Sport entries.
 */
const CoachSportsManualSync = () => (
  <FormSpy subscription={{ values: true }}>
    {({ values, form }) => (
      <CoachSportsManualSyncInner
        form={form}
        sports={normalizeCoachOfferedSportsFormValue(values?.[PUB_SPORTS_FIELD])}
        manual={normalizeCoachOfferedSportsFormValue(values?.[PUB_SPORTS_MANUAL_FIELD])}
        primary={String(values?.[PUB_PRIMARY_SPORT_FIELD] || '').trim()}
      />
    )}
  </FormSpy>
);

export default CoachSportsManualSync;
