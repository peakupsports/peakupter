import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';

import { SNOWBOARD_SPORT_KEYS, SKI_SPORT_KEYS } from '../../util/sportFilterKeys';

import css from './SportBar.module.css';

const SPORT_LABELS = {
  surf: 'Surf',
  mtb: 'MTB',
  tennis: 'Tennis',
  golf: 'Golf',
  climbing: 'Climbing',
  yoga: 'Yoga',
  skydive: 'Skydive',
  fitness: 'Fitness',
  wakeboard: 'Wakeboard',
  kitesurf: 'Kitesurf',
  snowboard: 'Snowboard',
  ski: 'Ski',
  crosscountry: 'Cross-country',
};

const SPORT_EMOJI = {
  surf: '🏄',
  mtb: '🚵',
  tennis: '🎾',
  golf: '⛳️',
  climbing: '🧗',
  yoga: '🧘',
  skydive: '🪂',
  fitness: '🏋️',
  wakeboard: '🏄',
  kitesurf: '🪁',
  snowboard: '🏂',
  ski: '🎿',
  crosscountry: '🎿',
};

const TOPBAR_SPORT_ORDER = [
  'surf',
  'mtb',
  'tennis',
  'golf',
  'climbing',
  'yoga',
  'skydive',
  'fitness',
  'wakeboard',
  'kitesurf',
  'snowboard',
  'ski',
  'crosscountry',
];

const WINTER_VARIANT_LABELS = {
  skitouring: 'Skitouring',
  splittouring: 'Split touring',
  freerideskiing: 'Freeride Skiing',
  freeridesnowboard: 'Freeride Snowboard',
  freestylesnowboard: 'Freestyle Snowboard',
  freestyleskiing: 'Freeski',
};

const WINTER_VARIANT_EMOJI = {
  skitouring: '🎿',
  splittouring: '🏂',
  freerideskiing: '🎿',
  freeridesnowboard: '🏂',
  freestylesnowboard: '🏂',
  freestyleskiing: '🎿',
};

const SNOWBOARD_VARIANT_KEYS = SNOWBOARD_SPORT_KEYS.filter(k => k !== 'snowboard');
const SKI_VARIANT_KEYS = SKI_SPORT_KEYS.filter(k => k !== 'ski');

const normalizeSportValue = value =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');

const normalizeSportKey = sport =>
  String(sport || '')
    .toLowerCase()
    .trim()
    .replace(/[\s-_]+/g, '');

const valueInKeySet = (value, keys) =>
  keys.some(k => normalizeSportKey(value) === normalizeSportKey(k));

const initialWinterAccordion = (value, includeWinterVariants) => {
  if (!includeWinterVariants) return null;
  const v = normalizeSportValue(value);
  if (valueInKeySet(v, SNOWBOARD_VARIANT_KEYS)) return 'snowboard';
  if (valueInKeySet(v, SKI_VARIANT_KEYS)) return 'ski';
  return null;
};

/**
 * SportBar: horizontal emoji+label chips.
 * Con `includeWinterVariants` le varianti ski/snowboard sono in un pannello accordion (Coach map).
 */
export const SportBar = props => {
  const {
    value,
    onChange,
    showAll = true,
    allLabel = 'All',
    includeWinterVariants = false,
    inTopbar = false,
    winterBare = false,
  } = props;

  const [expandedWinter, setExpandedWinter] = useState(() =>
    initialWinterAccordion(value, includeWinterVariants)
  );

  useEffect(() => {
    if (!includeWinterVariants) {
      setExpandedWinter(null);
      return;
    }
    const v = normalizeSportValue(value);
    const inSnowboard = valueInKeySet(v, SNOWBOARD_SPORT_KEYS);
    const inSki = valueInKeySet(v, SKI_SPORT_KEYS);
    if (!v || (!inSnowboard && !inSki)) {
      setExpandedWinter(null);
    }
  }, [value, includeWinterVariants]);

  const orderedEntries = useMemo(() => {
    const entriesByKey = Object.entries(SPORT_LABELS).reduce((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {});
    const inOrder = TOPBAR_SPORT_ORDER.filter(k => entriesByKey[k]).map(k => [k, entriesByKey[k]]);
    const leftovers = Object.entries(SPORT_LABELS)
      .filter(([k]) => !TOPBAR_SPORT_ORDER.includes(k))
      .sort(([a], [b]) => a.localeCompare(b));
    return [...inOrder, ...leftovers];
  }, []);

  const winterVariantEntriesSnowboard = useMemo(() => {
    if (!includeWinterVariants) return [];
    return SNOWBOARD_VARIANT_KEYS.filter(k => WINTER_VARIANT_LABELS[k]).map(k => [
      k,
      WINTER_VARIANT_LABELS[k],
    ]);
  }, [includeWinterVariants]);

  const winterVariantEntriesSki = useMemo(() => {
    if (!includeWinterVariants) return [];
    return SKI_VARIANT_KEYS.filter(k => WINTER_VARIANT_LABELS[k]).map(k => [k, WINTER_VARIANT_LABELS[k]]);
  }, [includeWinterVariants]);

  const handleWinterParentClick = (family, parentKey) => {
    if (expandedWinter === family) {
      setExpandedWinter(null);
      return;
    }
    setExpandedWinter(family);
    const keys = family === 'snowboard' ? SNOWBOARD_SPORT_KEYS : SKI_SPORT_KEYS;
    if (!valueInKeySet(value, keys)) {
      onChange(parentKey);
    }
  };

  return (
    <div
      className={classNames(css.root, {
        [css.rootInTopbar]: inTopbar,
        [css.rootWinterBare]: winterBare,
      })}
    >
      <div className={classNames(css.wrap, { [css.wrapInTopbar]: inTopbar })}>
        <div className={classNames(css.inner, { [css.innerInTopbar]: inTopbar })}>
          {showAll ? (
            <button
              type="button"
              className={classNames(css.chip, !value ? css.chipActive : null)}
              onClick={() => onChange('')}
            >
              <span className={css.chipEmoji} aria-hidden="true">
                🏅
              </span>
              <span className={css.chipLabel}>{allLabel}</span>
            </button>
          ) : null}

          {orderedEntries.map(([k, label]) => {
            if (includeWinterVariants && k === 'snowboard') {
              const isActive = valueInKeySet(value, SNOWBOARD_SPORT_KEYS);
              return (
                <button
                  key={k}
                  type="button"
                  className={classNames(css.chip, isActive ? css.chipActive : null)}
                  onClick={() => handleWinterParentClick('snowboard', 'snowboard')}
                  aria-expanded={expandedWinter === 'snowboard'}
                  aria-label={label}
                >
                  <span className={css.chipEmoji} aria-hidden="true">
                    {SPORT_EMOJI[k] || '🏅'}
                  </span>
                  <span className={css.chipLabel}>{label}</span>
                </button>
              );
            }
            if (includeWinterVariants && k === 'ski') {
              const isActive = valueInKeySet(value, SKI_SPORT_KEYS);
              return (
                <button
                  key={k}
                  type="button"
                  className={classNames(css.chip, isActive ? css.chipActive : null)}
                  onClick={() => handleWinterParentClick('ski', 'ski')}
                  aria-expanded={expandedWinter === 'ski'}
                  aria-label={label}
                >
                  <span className={css.chipEmoji} aria-hidden="true">
                    {SPORT_EMOJI[k] || '🏅'}
                  </span>
                  <span className={css.chipLabel}>{label}</span>
                </button>
              );
            }

            const isActive = normalizeSportKey(value) === normalizeSportKey(k);
            return (
              <button
                key={k}
                type="button"
                className={classNames(css.chip, isActive ? css.chipActive : null)}
                onClick={() => onChange(k)}
                aria-label={label}
              >
                <span className={css.chipEmoji} aria-hidden="true">
                  {SPORT_EMOJI[k] || '🏅'}
                </span>
                <span className={css.chipLabel}>{label}</span>
              </button>
            );
          })}
        </div>

        {includeWinterVariants && expandedWinter === 'snowboard' && winterVariantEntriesSnowboard.length ? (
          <div className={css.accordionPanel} role="region" aria-label="Snowboard">
            <div className={css.subinner}>
              {winterVariantEntriesSnowboard.map(([vk, vlabel]) => {
                const isActive = normalizeSportKey(value) === normalizeSportKey(vk);
                return (
                  <button
                    key={vk}
                    type="button"
                    className={classNames(css.chipSm, isActive ? css.chipSmActive : null)}
                    onClick={() => onChange(vk)}
                    aria-label={vlabel}
                  >
                    <span className={css.chipEmoji} aria-hidden="true">
                      {WINTER_VARIANT_EMOJI[vk] || '🏅'}
                    </span>
                    <span className={css.chipLabel}>{vlabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {includeWinterVariants && expandedWinter === 'ski' && winterVariantEntriesSki.length ? (
          <div className={css.accordionPanel} role="region" aria-label="Ski">
            <div className={css.subinner}>
              {winterVariantEntriesSki.map(([vk, vlabel]) => {
                const isActive = normalizeSportKey(value) === normalizeSportKey(vk);
                return (
                  <button
                    key={vk}
                    type="button"
                    className={classNames(css.chipSm, isActive ? css.chipSmActive : null)}
                    onClick={() => onChange(vk)}
                    aria-label={vlabel}
                  >
                    <span className={css.chipEmoji} aria-hidden="true">
                      {WINTER_VARIANT_EMOJI[vk] || '🏅'}
                    </span>
                    <span className={css.chipLabel}>{vlabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SportBar;

