import React, { useState } from 'react';
import classNames from 'classnames';

import { useIntl } from '../../util/reactIntl';
import IconDelete from '../IconDelete/IconDelete';
import IconSpinner from '../IconSpinner/IconSpinner';

import css from './ConversationArchiveButton.module.css';

/**
 * Archive (hide) a conversation from the current user's inbox.
 * UI label uses "Delete conversation"; no backend message deletion occurs.
 *
 * @param {Object} props
 * @param {() => Promise<unknown>} props.onArchive
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 * @returns {JSX.Element}
 */
const ConversationArchiveButton = props => {
  const { onArchive, disabled = false, className, rootClassName } = props;
  const intl = useIntl();
  const [inProgress, setInProgress] = useState(false);

  const label = intl.formatMessage({ id: 'ConversationArchiveButton.deleteConversation' });

  const handleClick = event => {
    event.preventDefault();
    event.stopPropagation();

    if (disabled || inProgress || !onArchive) {
      return;
    }

    setInProgress(true);
    Promise.resolve(onArchive())
      .catch(() => {
        // Caller may surface errors; keep button usable.
      })
      .finally(() => {
        setInProgress(false);
      });
  };

  return (
    <button
      type="button"
      className={classNames(css.root, rootClassName, className)}
      onClick={handleClick}
      disabled={disabled || inProgress}
      aria-label={label}
      title={label}
    >
      {inProgress ? (
        <IconSpinner rootClassName={css.spinner} />
      ) : (
        <IconDelete rootClassName={css.icon} />
      )}
    </button>
  );
};

export default ConversationArchiveButton;
