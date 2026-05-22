const COOKIES_POLICY_HREF = '/p/cookies';
const COOKIES_POLICY_MARKDOWN_LINK = '[Cookies Policy](/p/cookies)';
const CANCELLATION_POLICY_HREF = '/p/cancellation-policy';
const CANCELLATION_POLICY_MARKDOWN_LINK = '[Cancellation Policy](/p/cancellation-policy)';

const LEGAL_FOOTER_LINKS = [
  { href: COOKIES_POLICY_HREF, markdown: COOKIES_POLICY_MARKDOWN_LINK },
  { href: CANCELLATION_POLICY_HREF, markdown: CANCELLATION_POLICY_MARKDOWN_LINK },
];

const isCompanyLegalFooterBlock = block => {
  if (block?.blockType !== 'footerBlock') {
    return false;
  }
  const content = block?.text?.content;
  return (
    typeof content === 'string' &&
    /company/i.test(content) &&
    /legal/i.test(content)
  );
};

/**
 * Ensures the hosted footer "Company & Legal" column includes standard legal links.
 *
 * @param {Object} footer - Footer section config from hosted assets
 * @returns {Object} Footer config with legal links appended when applicable
 */
export const mergeFooterLegalLinks = footer => {
  if (!footer || !Array.isArray(footer.blocks)) {
    return footer;
  }

  const blocks = footer.blocks.map(block => {
    if (!isCompanyLegalFooterBlock(block)) {
      return block;
    }

    let content = block.text?.content || '';

    LEGAL_FOOTER_LINKS.forEach(({ href, markdown }) => {
      if (content.includes(href)) {
        return;
      }
      const linkLine = content.trimEnd().endsWith('\n') ? markdown : `\n- ${markdown}`;
      content = `${content.trimEnd()}${linkLine}`;
    });

    return {
      ...block,
      text: {
        ...block.text,
        content,
      },
    };
  });

  return { ...footer, blocks };
};
