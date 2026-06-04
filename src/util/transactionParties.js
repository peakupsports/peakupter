/**
 * Resolve a transaction party id from denormalised entity or JSON:API relationship.
 *
 * @param {Object|null|undefined} tx
 * @param {'provider'|'customer'} party
 * @returns {string|null}
 */
export const getTransactionPartyUuid = (tx, party) => {
  const entity = tx?.[party];
  if (entity?.id?.uuid) {
    return entity.id.uuid;
  }

  const relId = tx?.relationships?.[party]?.data?.id;
  if (relId?.uuid) {
    return relId.uuid;
  }
  if (typeof relId === 'string') {
    return relId;
  }

  return null;
};

/**
 * @param {Object|null|undefined} transaction
 * @param {string|null|undefined} currentUserId
 * @returns {boolean}
 */
export const isTransactionProviderUser = (transaction, currentUserId) =>
  Boolean(currentUserId) && getTransactionPartyUuid(transaction, 'provider') === currentUserId;
