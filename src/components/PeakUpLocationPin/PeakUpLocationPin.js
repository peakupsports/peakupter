import React from 'react';
import classNames from 'classnames';

import IconLocation from '../IconLocation/IconLocation';

import css from './PeakUpLocationPin.module.css';

/**
 * Tier-aware map pin (reads `--tier-accent` / `--tier-rgb` from an ancestor).
 *
 * @param {Object} props
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 */
const PeakUpLocationPin = props => {
  const { size = 'md', className, rootClassName } = props;
  const sizeClass =
    size === 'sm' ? css.rootSm : size === 'lg' ? css.rootLg : css.rootMd;

  return (
    <IconLocation
      rootClassName={classNames(css.root, sizeClass, rootClassName, className)}
    />
  );
};

export default PeakUpLocationPin;
