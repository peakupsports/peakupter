import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import { LandingPageComponent } from './LandingPage';

const { waitFor } = testingLibrary;

const imagePlaceholder = (width, height, label = 'test-image') => ({
  id: `${label}-${width}x${height}`,
  type: 'imageAsset',
  attributes: {
    variants: {
      default: {
        width,
        height,
        url: `https://fake.imgix.net/${label}-${width}x${height}.jpg`,
      },
      [`${label}-2x`]: {
        width: width * 2,
        height: height * 2,
        url: `https://fake.imgix.net/${label}-${width * 2}x${height * 2}.jpg`,
      },
    },
  },
});

describe('LandingPage', () => {
  it('renders the Fallback page on error', async () => {
    const errorMessage = 'LandingPage failed';
    let e = new Error(errorMessage);
    e.type = 'error';
    e.name = 'Test';

    const { getByText } = render(
      <LandingPageComponent pageAssetsData={null} inProgress={false} error={e} />
    );

    await waitFor(() => {
      expect(getByText('Oops, something went wrong!')).toBeInTheDocument();
      expect(getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('renders given pageAssetsData', async () => {
    const data = {
      sections: [
        {
          sectionType: 'columns',
          sectionId: 'test-section',
          numColumns: 1,
          title: { fieldType: 'heading2', content: 'Landing page' },
          description: {
            fieldType: 'paragraph',
            content: 'This is the description of the section',
          },
          blocks: [
            {
              blockType: 'defaultBlock',
              blockId: 'test-block',
              title: { fieldType: 'heading3', content: 'Block title here' },
              text: {
                fieldType: 'markdown',
                content: `**Lorem ipsum** dolor sit amet, consectetur adipiscing elit. Nulla orci nisi, lobortis sit amet posuere et, vulputate sit amet neque. Nam a est id lectus viverra sagittis. Proin sed imperdiet lorem. Duis aliquam fermentum purus, tincidunt venenatis felis gravida in. Sed imperdiet mi vitae consequat rhoncus. Sed velit leo, porta at lorem ac, iaculis fermentum leo. Morbi tellus orci, bibendum id ante vel, hendrerit efficitur lectus. Proin vitae condimentum justo. Phasellus finibus nisi quis neque feugiat, ac auctor ipsum suscipit.`,
              },
            },
          ],
        },
      ],
    };

    const { getByText } = render(
      <LandingPageComponent
        pageAssetsData={{ landingPage: { data } }}
        inProgress={false}
        error={null}
      />
    );

    await waitFor(() => {
      // Expect following texts to be found from rendered UI (inside <body>)
      expect(getByText('Landing page')).toBeInTheDocument();
      expect(getByText('This is the description of the section')).toBeInTheDocument();
      expect(getByText('Block title here')).toBeInTheDocument();
      expect(getByText('Lorem ipsum')).toBeInTheDocument();
    });
  });

  it('renders the premium Why PeakUp section override', async () => {
    const data = {
      sections: [
        {
          sectionType: 'features',
          sectionId: 'why-peakup-sports',
          title: { fieldType: 'heading2', content: 'Why PeakUp Sports?' },
          description: {
            fieldType: 'paragraph',
            content: 'Hosted copy that should be replaced by the custom landing section.',
          },
          blocks: [
            {
              blockType: 'defaultBlock',
              blockId: 'athlete-card',
              callToAction: {
                fieldType: 'internalButtonLink',
                content: 'Old CTA',
                href: '/s',
              },
            },
            {
              blockType: 'defaultBlock',
              blockId: 'coach-card',
              callToAction: {
                fieldType: 'internalButtonLink',
                content: 'Old coach CTA',
                href: '/p/become-a-coach',
              },
            },
          ],
        },
      ],
    };

    const { getByText, getAllByText } = render(
      <LandingPageComponent
        pageAssetsData={{ landingPage: { data } }}
        inProgress={false}
        error={null}
      />
    );

    await waitFor(() => {
      expect(
        getByText((_, node) => {
          const tagName = node?.tagName?.toLowerCase();
          return (
            tagName === 'h2' &&
            /PeakUp|LandingWhyPeakupSection\.titlePeakUp/.test(node?.textContent || '')
          );
        })
      ).toBeInTheDocument();
      expect(
        getByText((_, node) => {
          const tagName = node?.tagName?.toLowerCase();
          return (
            tagName === 'p' &&
            /One platform\. Two journeys\. Built for athletes and coaches\.|LandingWhyPeakupSection\.subtitle/.test(
              node?.textContent || ''
            )
          );
        })
      ).toBeInTheDocument();
      expect(
        getByText((_, node) => {
          const tagName = node?.tagName?.toLowerCase();
          return (
            tagName === 'a' &&
            /Find your coach|LandingWhyPeakupSection\.cardAthleteCta/.test(node?.textContent || '')
          );
        })
      ).toBeInTheDocument();
      expect(
        getByText((_, node) => {
          const tagName = node?.tagName?.toLowerCase();
          return (
            tagName === 'h3' &&
            /Become a coach|LandingWhyPeakupSection\.cardCoachTitle/.test(node?.textContent || '')
          );
        })
      ).toBeInTheDocument();
      expect(
        getAllByText((_, node) => {
          const tagName = node?.tagName?.toLowerCase();
          return (
            tagName === 'span' &&
            /Secure Booking|LandingWhyPeakupSection\.trustBooking/.test(node?.textContent || '')
          );
        })[0]
      ).toBeInTheDocument();
      expect(
        getAllByText((_, node) => {
          const tagName = node?.tagName?.toLowerCase();
          return (
            tagName === 'span' &&
            /24\/7 Support|LandingWhyPeakupSection\.trustSupport/.test(node?.textContent || '')
          );
        })[0]
      ).toBeInTheDocument();
    });
  });

  it('renders hosted block images inside Why PeakUp cards when media is provided', async () => {
    const data = {
      sections: [
        {
          sectionType: 'features',
          sectionId: 'why-peakup-sports',
          blocks: [
            {
              blockType: 'defaultBlock',
              blockId: 'athlete-card',
              media: {
                fieldType: 'image',
                alt: 'Athlete journey',
                image: imagePlaceholder(1200, 800, 'athlete-card'),
              },
            },
            {
              blockType: 'defaultBlock',
              blockId: 'coach-card',
              media: {
                fieldType: 'image',
                alt: 'Coach lifestyle',
                image: imagePlaceholder(1200, 800, 'coach-card'),
              },
              callToAction: {
                fieldType: 'internalButtonLink',
                content: 'Old coach CTA',
                href: '/p/become-a-coach',
              },
            },
          ],
        },
      ],
    };

    const { getByAltText } = render(
      <LandingPageComponent
        pageAssetsData={{ landingPage: { data } }}
        inProgress={false}
        error={null}
      />
    );

    await waitFor(() => {
      expect(getByAltText('Athlete journey')).toBeInTheDocument();
      expect(getByAltText('Coach lifestyle')).toBeInTheDocument();
    });
  });
});
