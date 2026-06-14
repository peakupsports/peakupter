import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import Field, { hasDataInFields } from '../PageBuilder/Field';
import BlockBuilder from '../PageBuilder/BlockBuilder';
import SectionContainer from '../PageBuilder/SectionBuilder/SectionContainer';
import columnCss from '../PageBuilder/SectionBuilder/SectionColumns/SectionColumns.module.css';

const THREE_COLUMN_IMAGE_SIZES = '(max-width: 767px) 100vw, 400px';

const cardContent = [
  {
    titleId: 'LandingHowItWorksSection.cardFindBookTitle',
    titleDefault: 'Find & Book',
    textId: 'LandingHowItWorksSection.cardFindBookText',
    textDefault:
      'Browse professionals, check availability, and book your session in minutes.',
  },
  {
    titleId: 'LandingHowItWorksSection.cardEnjoyTitle',
    titleDefault: 'Enjoy Your Session',
    textId: 'LandingHowItWorksSection.cardEnjoyText',
    textDefault: 'Train with experienced professionals and improve your skills.',
  },
  {
    titleId: 'LandingHowItWorksSection.cardReviewTitle',
    titleDefault: 'Leave a Review',
    textId: 'LandingHowItWorksSection.cardReviewText',
    textDefault:
      'Help others find the right professional. Share your experience with the community.',
  },
];

const buildLocalizedBlock = (block, content, intl) => {
  if (!content) {
    return block;
  }

  const localizedFields = {
    title: {
      fieldType: 'heading3',
      content: intl.formatMessage({
        id: content.titleId,
        defaultMessage: content.titleDefault,
      }),
    },
    text: {
      fieldType: 'markdown',
      content: intl.formatMessage({
        id: content.textId,
        defaultMessage: content.textDefault,
      }),
    },
  };

  if (block) {
    return { ...block, ...localizedFields };
  }

  return {
    blockType: 'defaultBlock',
    blockId: content.titleId,
    ...localizedFields,
  };
};

/**
 * Localized override for the landing page "How It Works" three-card section.
 * Hosted CMS copy stays in English; this component renders locale strings instead.
 */
const LandingHowItWorksSection = props => {
  const intl = useIntl();
  const {
    sectionId,
    className,
    rootClassName,
    defaultClasses,
    appearance,
    callToAction,
    blocks = [],
    options,
  } = props;

  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };
  const hasSectionCta = hasDataInFields([callToAction], fieldOptions);

  const localizedBlocks = cardContent.map((content, index) =>
    buildLocalizedBlock(blocks[index], content, intl)
  );

  return (
    <SectionContainer
      id={sectionId}
      className={className}
      rootClassName={rootClassName}
      appearance={appearance}
      options={fieldOptions}
    >
      <header className={defaultClasses.sectionDetails}>
        <h2 className={defaultClasses.title}>
          <FormattedMessage id="LandingHowItWorksSection.title" defaultMessage="How It Works" />
        </h2>
        <p className={defaultClasses.description}>
          <FormattedMessage
            id="LandingHowItWorksSection.subtitle"
            defaultMessage="Find a professional. Book your session. Enjoy your sport."
          />
        </p>
        {hasSectionCta ? (
          <Field
            data={callToAction}
            className={defaultClasses.ctaButton}
            options={fieldOptions}
          />
        ) : null}
      </header>

      <div className={classNames(defaultClasses.blockContainer, columnCss.threeColumns)}>
        <BlockBuilder
          ctaButtonClass={defaultClasses.ctaButton}
          blocks={localizedBlocks}
          sectionId={sectionId}
          responsiveImageSizes={THREE_COLUMN_IMAGE_SIZES}
          options={options}
        />
      </div>
    </SectionContainer>
  );
};

export default LandingHowItWorksSection;
