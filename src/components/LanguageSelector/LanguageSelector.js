import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import {
  isStoredPeakUpLocaleCode,
  PEAKUP_LOCALE_OPTIONS,
  peakUpIntlLocaleToCode,
  setStoredPeakUpLocaleCode,
} from '../../util/peakupLocale';
import Menu from '../Menu/Menu';
import MenuContent from '../MenuContent/MenuContent';
import MenuItem from '../MenuItem/MenuItem';
import MenuLabel from '../MenuLabel/MenuLabel';

import css from './LanguageSelector.module.css';

/**
 * PeakUp language selector — persists choice in localStorage and reloads.
 *
 * @param {object} props
 * @param {'desktop'|'mobile'|'mobileMenu'} [props.variant]
 * @param {string} [props.className]
 */
const LanguageSelector = props => {
  const { variant = 'desktop', className } = props;
  const intl = useIntl();
  const currentCode = peakUpIntlLocaleToCode(intl.locale);

  const handleSelect = code => {
    if (isStoredPeakUpLocaleCode(code)) {
      return;
    }
    setStoredPeakUpLocaleCode(code);
  };

  if (variant === 'mobileMenu') {
    return (
      <div className={classNames(css.mobileMenuSection, className)}>
        <p className={css.mobileMenuHeading}>
          <FormattedMessage id="LanguageSelector.label" />
        </p>
        <ul className={css.mobileMenuList}>
          {PEAKUP_LOCALE_OPTIONS.map(option => {
            const isActive = option.code === currentCode;
            return (
              <li key={option.code}>
                <button
                  type="button"
                  className={classNames(css.mobileMenuOption, isActive ? css.optionActive : null)}
                  onClick={() => handleSelect(option.code)}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {option.nativeLabel}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const isMobile = variant === 'mobile';

  return (
    <Menu className={classNames(css.root, isMobile ? css.rootMobile : css.rootDesktop, className)}>
      <MenuLabel className={css.menuLabel}>
        <span className={css.trigger} aria-hidden>
          <span className={css.globe}>🌐</span>
          <span className={css.code}>{currentCode.toUpperCase()}</span>
        </span>
        <span className={css.srOnly}>
          <FormattedMessage id="LanguageSelector.label" />
        </span>
      </MenuLabel>
      <MenuContent className={css.menuContent}>
        {PEAKUP_LOCALE_OPTIONS.map(option => {
          const isActive = option.code === currentCode;
          return (
            <MenuItem key={option.code}>
              <button
                type="button"
                className={classNames(css.menuOption, isActive ? css.optionActive : null)}
                onClick={() => handleSelect(option.code)}
                aria-current={isActive ? 'true' : undefined}
              >
                {option.nativeLabel}
              </button>
            </MenuItem>
          );
        })}
      </MenuContent>
    </Menu>
  );
};

export default LanguageSelector;
