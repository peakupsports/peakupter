import {
  ARCHIVED_CONVERSATION_IDS_KEY,
  buildPrivateDataWithArchivedIds,
  filterTransactionsExcludingArchived,
  getArchivedConversationIds,
  hasIncomingMessageFromOtherParty,
  isTransactionArchived,
} from './archivedConversations';

const currentUser = {
  attributes: {
    profile: {
      privateData: {
        [ARCHIVED_CONVERSATION_IDS_KEY]: ['tx-archived', 'tx-other'],
      },
    },
  },
};

describe('archivedConversations', () => {
  it('reads archived transaction ids from privateData', () => {
    expect(getArchivedConversationIds(currentUser)).toEqual(['tx-archived', 'tx-other']);
  });

  it('merges archived ids into privateData', () => {
    const privateData = buildPrivateDataWithArchivedIds(currentUser, ['tx-new']);
    expect(privateData[ARCHIVED_CONVERSATION_IDS_KEY]).toEqual(['tx-new']);
  });

  it('filters archived transactions from inbox list', () => {
    const transactions = [
      { id: { uuid: 'tx-archived' } },
      { id: { uuid: 'tx-visible' } },
    ];
    const filtered = filterTransactionsExcludingArchived(transactions, currentUser);
    expect(filtered.map(tx => tx.id.uuid)).toEqual(['tx-visible']);
  });

  it('detects archived state', () => {
    expect(isTransactionArchived(currentUser, 'tx-archived')).toBe(true);
    expect(isTransactionArchived(currentUser, 'tx-visible')).toBe(false);
  });

  it('detects incoming messages from the other party', () => {
    const messages = [
      {
        attributes: { createdAt: '2026-05-19T09:00:00.000Z' },
        sender: { id: { uuid: 'user-a' } },
      },
      {
        attributes: { createdAt: '2026-05-19T10:00:00.000Z' },
        sender: { id: { uuid: 'user-b' } },
      },
    ];
    expect(hasIncomingMessageFromOtherParty(messages, 'user-a')).toBe(true);
    expect(hasIncomingMessageFromOtherParty(messages, 'user-b')).toBe(false);
  });
});
