import React from 'react';

import { renderWithProviders, testingLibrary } from '../../../../util/testHelpers';

import { SearchCTA } from './SearchCTA';

const { screen, within } = testingLibrary;

describe('SearchCTA category dropdown', () => {
  it('localizes the submit button and field placeholders', () => {
    renderWithProviders(
      <SearchCTA
        searchFields={{ categories: true, locationSearch: true, dateRange: true }}
      />,
      {
        messages: {
          'PageBuilder.SearchCTA.buttonLabel': 'Profis finden',
          'PageBuilder.SearchCTA.CategoryFilter.placeholder': 'Sport',
          'PageBuilder.SearchCTA.locationPlaceholder': 'Ort',
          'PageBuilder.SearchCTA.dateFilterPlaceholder': 'Datum',
        },
      }
    );

    const searchForm = screen.getByRole('search');
    expect(searchForm.textContent).toContain('Profis finden');
    expect(searchForm.textContent).toContain('Sport');
    expect(searchForm.textContent).toContain('Datum');
    expect(searchForm.textContent).not.toContain('Find professionals');
    expect(searchForm.textContent).not.toContain('Your sport');
  });

  it('renders the canonical PeakUp sport taxonomy in the same order as the SportBar', async () => {
    const user = testingLibrary.userEvent.setup();

    renderWithProviders(<SearchCTA searchFields={{ categories: true }} />);

    await user.click(screen.getByRole('combobox'));

    const listbox = screen.getByRole('listbox');
    const options = within(listbox)
      .getAllByRole('option')
      .map(option => option.textContent.trim());

    expect(options[0]).toBeTruthy();
    expect(options.slice(1)).toEqual([
      'Surf',
      'MTB',
      'Tennis',
      'Golf',
      'Climbing',
      'Yoga',
      'Skydive',
      'Fitness',
      'Wakeboard',
      'Wakesurf',
      'Kitesurf',
      'Skateboard',
      'Snowboard',
      'Ski',
      'Cross-country',
    ]);
  });
});
