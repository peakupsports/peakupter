import { denormalisedEntities } from './data';
import { logPeakupTransactionFallbackError } from './errors';

/**
 * Denormalise one relationship bucket without failing the whole transaction.
 *
 * @param {Object} entities marketplace entity store
 * @param {{ data?: object|object[] }} relRef SDK relationship ref
 * @returns {object|object[]|null}
 */
const denormaliseRelationshipMaybe = (entities, relRef) => {
  const hasMultipleRefs = Array.isArray(relRef?.data);
  const multipleRefsEmpty = hasMultipleRefs && relRef.data.length === 0;

  if (!relRef?.data || multipleRefsEmpty) {
    return hasMultipleRefs ? [] : null;
  }

  const refs = hasMultipleRefs ? relRef.data : [relRef.data];

  try {
    const rels = denormalisedEntities(entities, refs, false);
    return hasMultipleRefs ? rels : rels[0] || null;
  } catch (relationshipError) {
    logPeakupTransactionFallbackError(relationshipError, {
      phase: 'transactionPageEntities.relationship',
      relationshipIds: refs.map(r => `${r?.type}:${r?.id?.uuid}`).join(','),
    });
    return hasMultipleRefs ? [] : null;
  }
};

/**
 * Transaction-only denormalisation for canceled bookings when listing (or other
 * nested includes) are missing from `marketplaceData`. Does not change global
 * `getMarketplaceEntities` / `denormalisedEntities` behavior.
 *
 * @param {Object} entities `state.marketplaceData.entities`
 * @param {{ id: object, type: string }} transactionRef
 * @returns {object|null}
 */
export const denormaliseTransactionForTransactionPage = (entities, transactionRef) => {
  const { id, type } = transactionRef || {};
  const raw = entities?.[type]?.[id?.uuid];
  if (!raw) {
    return null;
  }

  const { relationships, ...entityData } = raw;
  const transaction = { ...entityData, id, type };

  if (!relationships) {
    return transaction;
  }

  Object.entries(relationships).forEach(([relName, relRef]) => {
    if (relName === 'listing') {
      try {
        transaction.listing = denormaliseRelationshipMaybe(entities, relRef);
      } catch (listingError) {
        logPeakupTransactionFallbackError(listingError, {
          phase: 'transactionPageEntities.listing',
          transactionId: id?.uuid,
        });
        transaction.listing = null;
      }
      return;
    }

    transaction[relName] = denormaliseRelationshipMaybe(entities, relRef);
  });

  return transaction;
};

/**
 * Load the transaction entity for TransactionPage from Redux.
 *
 * @param {Object} state Redux root state
 * @param {{ id: object, type: string }|null|undefined} transactionRef
 * @returns {object|null}
 */
export const getTransactionForTransactionPage = (state, transactionRef) => {
  if (!transactionRef?.id?.uuid) {
    return null;
  }

  const entities = state.marketplaceData?.entities || {};

  try {
    const denormalised = denormalisedEntities(entities, [transactionRef], false);
    return denormalised[0] || null;
  } catch (denormalizeError) {
    logPeakupTransactionFallbackError(denormalizeError, {
      phase: 'TransactionPage.getTransactionForTransactionPage',
      transactionId: transactionRef.id.uuid,
    });
    return denormaliseTransactionForTransactionPage(entities, transactionRef);
  }
};
