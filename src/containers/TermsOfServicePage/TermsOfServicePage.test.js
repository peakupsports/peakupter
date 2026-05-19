import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import TermsOfServicePage from './TermsOfServicePage';

const { waitFor } = testingLibrary;

describe('TermsOfServicePage', () => {
  it('renders the premium terms hero and definitions section', async () => {
    const { getByText, getByRole } = render(<TermsOfServicePage />);

    await waitFor(() => {
      expect(getByText('PeakUp Sports Terms of Service')).toBeInTheDocument();
      expect(getByText('Download PDF')).toBeInTheDocument();
      expect(getByRole('heading', { name: 'Definitions' })).toBeInTheDocument();
    });
  });
});
