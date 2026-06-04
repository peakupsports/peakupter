import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import PreBookingIntroModal from './PreBookingIntroModal';

const { screen } = testingLibrary;

const noop = () => null;

describe('PreBookingIntroModal', () => {
  it('hides sport field and preselects when listing has one sport', () => {
    render(
      <PreBookingIntroModal
        id="test-prebooking"
        isOpen
        onClose={noop}
        onContinue={noop}
        sportOptions={[{ value: 'skydive', label: 'Skydive' }]}
        initialSport="skydive"
      />,
      { withPortals: true }
    );

    expect(screen.queryByLabelText('PreBookingIntroModal.sportLabel')).not.toBeInTheDocument();
    expect(screen.getByLabelText('PreBookingIntroModal.participantTypeLabel')).toBeInTheDocument();
  });

  it('hides sport field for single tennis listing sport', () => {
    render(
      <PreBookingIntroModal
        id="test-prebooking-tennis"
        isOpen
        onClose={noop}
        onContinue={noop}
        sportOptions={[{ value: 'tennis', label: 'Tennis' }]}
        initialSport="tennis"
      />,
      { withPortals: true }
    );

    expect(screen.queryByLabelText('PreBookingIntroModal.sportLabel')).not.toBeInTheDocument();
  });

  it('shows sport dropdown with only listing sports when multiple', () => {
    render(
      <PreBookingIntroModal
        id="test-prebooking-multi"
        isOpen
        onClose={noop}
        onContinue={noop}
        sportOptions={[
          { value: 'ski', label: 'Ski' },
          { value: 'snowboard', label: 'Snowboard' },
        ]}
        initialSport=""
      />,
      { withPortals: true }
    );

    const sportSelect = screen.getByLabelText('PreBookingIntroModal.sportLabel');
    expect(sportSelect).toBeInTheDocument();
    expect(sportSelect).toHaveValue('');
    const options = Array.from(sportSelect.querySelectorAll('option')).map(o => o.value);
    expect(options).toEqual(['', 'ski', 'snowboard']);
  });
});
