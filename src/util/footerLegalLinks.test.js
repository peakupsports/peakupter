import { mergeFooterLegalLinks } from './footerLegalLinks';

describe('mergeFooterLegalLinks', () => {
  const companyLegalBlock = {
    blockType: 'footerBlock',
    text: {
      fieldType: 'markdown',
      content: '**Company & Legal**\n\n- [Terms](/p/terms)\n- [Privacy](/p/privacy)',
    },
  };

  it('appends Cookies Policy and Cancellation Policy links to Company & Legal column', () => {
    const footer = { blocks: [companyLegalBlock] };
    const result = mergeFooterLegalLinks(footer);

    expect(result.blocks[0].text.content).toContain('[Cookies Policy](/p/cookies)');
    expect(result.blocks[0].text.content).toContain(
      '[Cancellation Policy](/p/cancellation-policy)'
    );
  });

  it('does not duplicate Cookies Policy link', () => {
    const footer = {
      blocks: [
        {
          ...companyLegalBlock,
          text: {
            ...companyLegalBlock.text,
            content: `${companyLegalBlock.text.content}\n- [Cookies Policy](/p/cookies)`,
          },
        },
      ],
    };
    const result = mergeFooterLegalLinks(footer);
    const matches = result.blocks[0].text.content.match(/\/p\/cookies/g);

    expect(matches).toHaveLength(1);
  });

  it('leaves unrelated footer blocks unchanged', () => {
    const otherBlock = {
      blockType: 'footerBlock',
      text: { fieldType: 'markdown', content: '**Explore sports**' },
    };
    const footer = { blocks: [otherBlock] };
    const result = mergeFooterLegalLinks(footer);

    expect(result.blocks[0]).toEqual(otherBlock);
  });
});
