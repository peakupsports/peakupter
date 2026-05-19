import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';

import {
  TERMS_GROUPS,
  TERMS_INTRO,
} from './termsContent';

import css from './TermsOfServicePage.module.css';

const WarningBox = ({ children }) => (
  <div className={css.warningBox} role="note">
    {children}
  </div>
);

WarningBox.propTypes = {
  children: PropTypes.node.isRequired,
};

const DefinitionList = ({ items }) => (
  <dl className={css.definitionList}>
    {items.map(item => (
      <div key={item.term} className={css.definitionItem}>
        <dt className={css.definitionTerm}>{item.term}</dt>
        <dd className={css.definitionDesc}>{item.definition}</dd>
      </div>
    ))}
  </dl>
);

DefinitionList.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      term: PropTypes.string.isRequired,
      definition: PropTypes.string.isRequired,
    })
  ).isRequired,
};

const SubsectionBlock = ({ subsection }) => (
  <div className={css.subsection}>
    {subsection.label ? <h4 className={css.subsectionLabel}>{subsection.label}</h4> : null}
    {subsection.paragraphs?.map((paragraph, index) => (
      <p key={index} className={css.paragraph}>
        {paragraph}
      </p>
    ))}
    {subsection.items?.length > 0 ? (
      <ul className={css.bulletList}>
        {subsection.items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    ) : null}
  </div>
);

SubsectionBlock.propTypes = {
  subsection: PropTypes.shape({
    label: PropTypes.string,
    paragraphs: PropTypes.arrayOf(PropTypes.string),
    items: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

const SectionBlock = ({ section }) => (
  <article id={section.id} className={css.legalSection}>
    <header className={css.legalSectionHeader}>
      <span className={css.sectionNumber}>{section.number}</span>
      <h3 className={css.sectionTitle}>{section.title}</h3>
    </header>

    {section.warnings?.map((warning, index) => (
      <WarningBox key={index}>
        <p className={css.warningText}>{warning}</p>
      </WarningBox>
    ))}

    {section.definitions ? <DefinitionList items={section.definitions} /> : null}

    {section.paragraphs?.map((paragraph, index) => (
      <p key={index} className={css.paragraph}>
        {paragraph}
      </p>
    ))}

    {section.subsections?.map((subsection, index) => (
      <SubsectionBlock key={subsection.label || index} subsection={subsection} />
    ))}
  </article>
);

SectionBlock.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.string.isRequired,
    number: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    paragraphs: PropTypes.arrayOf(PropTypes.string),
    warnings: PropTypes.arrayOf(PropTypes.string),
    definitions: PropTypes.array,
    subsections: PropTypes.array,
  }).isRequired,
};

/**
 * Structured Terms body — shared by full page and auth modal.
 */
const PeakUpTermsDocument = ({ variant = 'page', className }) => {
  const isModal = variant === 'modal';

  return (
    <div className={classNames(css.document, isModal && css.documentModal, className)}>
      <div className={css.introBlock}>
        {TERMS_INTRO.paragraphs.map((paragraph, index) => (
          <p key={index} className={css.paragraph}>
            {paragraph}
          </p>
        ))}
        {TERMS_INTRO.warnings.map((warning, index) => (
          <WarningBox key={index}>
            <p className={css.warningText}>{warning}</p>
          </WarningBox>
        ))}
      </div>

      {TERMS_GROUPS.map(group => (
        <section
          key={group.navId}
          id={group.navId}
          className={css.navGroup}
          aria-labelledby={`terms-nav-${group.navId}`}
        >
          <div className={css.glassSeparator} aria-hidden="true" />
          {group.sections.map(section => (
            <SectionBlock key={section.id} section={section} />
          ))}
        </section>
      ))}
    </div>
  );
};

PeakUpTermsDocument.propTypes = {
  variant: PropTypes.oneOf(['page', 'modal']),
  className: PropTypes.string,
};

export default PeakUpTermsDocument;
