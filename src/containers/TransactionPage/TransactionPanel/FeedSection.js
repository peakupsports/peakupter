import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { Heading } from '../../../components';

import css from './TransactionPanel.module.css';

// Functional component as a helper to build ActivityFeed section
const FeedSection = props => {
  const {
    className,
    rootClassName,
    activityFeed,
    hasTransitions,
    fetchMessagesError,
    hasMessages,
    isConversation,
    hideSectionHeading,
    isPeakUpBookingTheme,
  } = props;

  const showFeed = hasMessages || hasTransitions || fetchMessagesError;

  const classes = classNames(rootClassName || css.feedContainer, className, {
    [css.feedContainerPeakUp]: hideSectionHeading,
    [css.peakUpBookingFeedSection]: isPeakUpBookingTheme,
  });

  return showFeed ? (
    <div className={classes}>
      {hideSectionHeading ? null : (
        <Heading
          as="h3"
          rootClassName={classNames(css.sectionHeading, {
            [css.peakUpBookingSectionHeading]: isPeakUpBookingTheme,
          })}
        >
          {isConversation ? (
            <FormattedMessage id="TransactionPanel.conversationHeading" />
          ) : (
            <FormattedMessage id="TransactionPanel.activityHeading" />
          )}
        </Heading>
      )}
      {fetchMessagesError ? (
        <p className={css.messageError}>
          <FormattedMessage id="TransactionPanel.messageLoadingFailed" />
        </p>
      ) : null}
      <div className={css.feedContent}>{activityFeed}</div>
    </div>
  ) : null;
};

export default FeedSection;
