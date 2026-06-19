import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';

import css from './SportEmojiTooltip.module.css';

const HOVER_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';

const getTooltipCoords = badgeEl => {
  if (!badgeEl || typeof window === 'undefined') {
    return null;
  }
  const rect = badgeEl.getBoundingClientRect();
  return {
    top: rect.top - 8,
    left: rect.left + rect.width / 2,
  };
};

/**
 * Emoji-only sport badge with a PeakUp dark tooltip (hover on desktop, tap on touch).
 *
 * @param {Object} props
 * @param {string} props.emoji
 * @param {string} props.label Localized sport name
 * @param {string} [props.badgeClassName] Existing badge surface styles (e.g. figurina footer bubble)
 * @param {string} [props.className]
 */
const SportEmojiTooltip = props => {
  const { emoji, label, badgeClassName, className } = props;
  const badgeRef = useRef(null);
  const tooltipId = useId();
  const [hoverOpen, setHoverOpen] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [coords, setCoords] = useState(null);

  const isVisible = canHover ? hoverOpen : touchOpen;

  const syncCoords = useCallback(() => {
    setCoords(getTooltipCoords(badgeRef.current));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const mq = window.matchMedia(HOVER_MEDIA_QUERY);
    const update = () => setCanHover(mq.matches);
    update();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setCoords(null);
      return undefined;
    }
    syncCoords();
    const onLayoutChange = () => syncCoords();
    window.addEventListener('scroll', onLayoutChange, true);
    window.addEventListener('resize', onLayoutChange);
    return () => {
      window.removeEventListener('scroll', onLayoutChange, true);
      window.removeEventListener('resize', onLayoutChange);
    };
  }, [isVisible, syncCoords]);

  useEffect(() => {
    if (!touchOpen || canHover) {
      return undefined;
    }
    const onPointerDown = event => {
      if (badgeRef.current && !badgeRef.current.contains(event.target)) {
        setTouchOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [touchOpen, canHover]);

  const handleMouseEnter = () => {
    if (canHover) {
      setHoverOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (canHover) {
      setHoverOpen(false);
    }
  };

  const handleBadgeClick = event => {
    if (canHover) {
      return;
    }
    event.stopPropagation();
    setTouchOpen(prev => !prev);
  };

  const handleBadgeKeyDown = event => {
    if (canHover || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setTouchOpen(prev => !prev);
  };

  const tooltip =
    isVisible && coords && typeof document !== 'undefined'
      ? createPortal(
          <span
            id={tooltipId}
            className={css.tooltipPortal}
            role="tooltip"
            style={{ top: coords.top, left: coords.left }}
          >
            {label}
          </span>,
          document.body
        )
      : null;

  return (
    <>
      <span
        className={classNames(css.root, className, touchOpen && css.touchOpen)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span
          ref={badgeRef}
          className={classNames(css.badge, badgeClassName)}
          role={canHover ? undefined : 'button'}
          tabIndex={canHover ? undefined : 0}
          aria-label={label}
          aria-describedby={!canHover && touchOpen ? tooltipId : undefined}
          onClick={handleBadgeClick}
          onKeyDown={handleBadgeKeyDown}
        >
          {emoji}
        </span>
      </span>
      {tooltip}
    </>
  );
};

export default SportEmojiTooltip;
