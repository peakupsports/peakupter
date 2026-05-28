const sharetribeSdk = require('sharetribe-flex-sdk');
const { transactionLineItems } = require('../api-util/lineItems');
const { isIntentionToMakeOffer } = require('../api-util/negotiation');
const {
  getSdk,
  getTrustedSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');
const { omitPeakupInternalParams } = require('../api-util/peakupParams');
const {
  validatePeakUpHoldBeforeInitiate,
  finalizePeakUpHoldAfterSuccessfulInitiate,
} = require('../api-util/peakupBookingHoldAssertions');
const { findReferralForCoach } = require('../api-util/referralCoachLookup');

const { Money } = sharetribeSdk.types;

const listingPromise = (sdk, id) => sdk.listings.show({ id });

const getFullOrderData = (orderData, bodyParams, currency) => {
  const { offerInSubunits } = orderData || {};
  const transitionName = bodyParams.transition;

  return isIntentionToMakeOffer(offerInSubunits, transitionName)
    ? {
        ...orderData,
        ...bodyParams.params,
        currency,
        offer: new Money(offerInSubunits, currency),
      }
    : { ...orderData, ...bodyParams.params };
};

const getMetadata = (orderData, transition) => {
  const { actor, offerInSubunits } = orderData || {};
  // NOTE: for now, the actor is always "provider".
  const hasActor = ['provider', 'customer'].includes(actor);
  const by = hasActor ? actor : null;

  return isIntentionToMakeOffer(offerInSubunits, transition)
    ? {
        metadata: {
          offers: [
            {
              offerInSubunits,
              by,
              transition,
            },
          ],
        },
      }
    : {};
};

module.exports = (req, res) => {
  const { isSpeculative, orderData, bodyParams, queryParams, peakupBookingHoldId } = req.body || {};
  const transitionName = bodyParams.transition;
  const sdk = getSdk(req, res);
  let lineItems = null;
  let metadataMaybe = {};
  let listingForHold = null;

  Promise.all([listingPromise(sdk, bodyParams?.params?.listingId), fetchCommission(sdk)])
    .then(([showListingResponse, fetchAssetsResponse]) => {
      const listing = showListingResponse.data.data;
      listingForHold = listing;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const currency = listing.attributes.price?.currency || orderData.currency;
      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      const mergedOrderData = getFullOrderData(orderData, bodyParams, currency);

      lineItems = transactionLineItems(
        listing,
        mergedOrderData,
        providerCommission,
        customerCommission
      );
      metadataMaybe = getMetadata(orderData, transitionName);

      validatePeakUpHoldBeforeInitiate({
        isSpeculative,
        listing,
        mergedOrderData,
        peakupBookingHoldId,
      });

      return getTrustedSdk(req);
    })
    .then(trustedSdk => {
      const { params } = bodyParams;
      const safeParams = omitPeakupInternalParams(params);

      // Referral ownership is provider-based (coach → ambassador), not customer-code based.
      // Snapshot into protectedData as best-effort; never block checkout on failures.
      let referralSnapshot = null;
      try {
        const providerId = listingForHold?.relationships?.author?.data?.id?.uuid || null;
        if (!providerId) {
          console.info('[PeakUp REFERRAL SNAPSHOT INITIATE]', {
            providerId: null,
            referralOwnerId: null,
            referralId: null,
            skippedReason: 'missing_provider_id',
          });
        } else {
          const referral = findReferralForCoach({ coachUserId: providerId }) || null;
          const referralOwnerId = referral?.ambassadorUserId || null;
          const referralId = referral?.id || null;

          if (!referral) {
            console.info('[PeakUp REFERRAL SNAPSHOT INITIATE]', {
              providerId,
              referralOwnerId: null,
              referralId: null,
              skippedReason: 'no_referral_ledger',
            });
          } else if (!referralOwnerId) {
            console.info('[PeakUp REFERRAL SNAPSHOT INITIATE]', {
              providerId,
              referralOwnerId: null,
              referralId,
              skippedReason: 'missing_referral_owner',
            });
          } else {
            referralSnapshot = {
              peakupReferralOwnerId: referralOwnerId,
              peakupReferredCoachId: providerId,
              peakupReferralId: referralId,
            };
            console.info('[PeakUp REFERRAL SNAPSHOT INITIATE]', {
              providerId,
              referralOwnerId,
              referralId,
              skippedReason: null,
            });
          }
        }
      } catch (error) {
        console.warn('[PeakUp REFERRAL SNAPSHOT INITIATE]', {
          providerId: listingForHold?.relationships?.author?.data?.id?.uuid || null,
          referralOwnerId: null,
          referralId: null,
          skippedReason: 'error',
          error: error?.message || String(error),
        });
      }

      let mergedProtectedData = referralSnapshot
        ? {
            ...(safeParams?.protectedData && typeof safeParams.protectedData === 'object'
              ? safeParams.protectedData
              : {}),
            ...referralSnapshot,
          }
        : safeParams?.protectedData;

      const assignedCoachUserId = orderData?.assignedCoachUserId
        ? String(orderData.assignedCoachUserId).trim()
        : '';
      if (assignedCoachUserId) {
        mergedProtectedData = {
          ...(mergedProtectedData && typeof mergedProtectedData === 'object'
            ? mergedProtectedData
            : {}),
          assignedCoachUserId,
          ...(orderData?.assignedCoachDisplayName
            ? {
                assignedCoachDisplayName: String(orderData.assignedCoachDisplayName).trim(),
              }
            : {}),
        };
      }

      // Add lineItems to the body params
      const body = {
        ...bodyParams,
        params: {
          ...safeParams,
          lineItems,
          ...metadataMaybe,
          ...(mergedProtectedData ? { protectedData: mergedProtectedData } : {}),
        },
      };

      if (isSpeculative) {
        return trustedSdk.transactions.initiateSpeculative(body, queryParams);
      }
      return trustedSdk.transactions.initiate(body, queryParams);
    })
    .then(apiResponse => {
      finalizePeakUpHoldAfterSuccessfulInitiate({
        isSpeculative,
        listing: listingForHold,
        peakupBookingHoldId,
      });

      const { status, statusText, data } = apiResponse;
      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({

          
            status,
            statusText,
            data,
          })
        )
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
