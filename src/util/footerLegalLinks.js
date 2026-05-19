const COOKIES_POLICY_HREF = '/p/cookies';
const COOKIES_POLICY_MARKDOWN_LINK = '[Cookies Policy](/p/cookies)';

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
 * Ensures the hosted footer "Company & Legal" column includes a Cookies Policy link.
 *
 * @param {Object} footer - Footer section config from hosted assets
 * @returns {Object} Footer config with Cookies Policy link appended when applicable
 */
export const mergeFooterLegalLinks = footer => {
  if (!footer || !Array.isArray(footer.blocks)) {
    return footer;
  }

  const blocks = footer.blocks.map(block => {
    if (!isCompanyLegalFooterBlock(block)) {
      return block;
    }

    const content = block.text?.content || '';
    if (content.includes(COOKIES_POLICY_HREF)) {
      return block;
    }

    const linkLine = content.trimEnd().endsWith('\n')
      ? COOKIES_POLICY_MARKDOWN_LINK
      : `\n- ${COOKIES_POLICY_MARKDOWN_LINK}`;

    return {
      ...block,
      text: {
        ...block.text,
        content: `${content.trimEnd()}${linkLine}`,
      },
    };
  });

  return { ...footer, blocks };
};
