import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';

import {
  PEAKUP_TOP_LEVEL_SPORT_LABELS,
  PEAKUP_TOP_LEVEL_SPORT_ORDER,
  PEAKUP_WINTER_VARIANT_LABELS,
} from '../../util/peakupSportTaxonomy';
import { SNOWBOARD_SPORT_KEYS, SKI_SPORT_KEYS } from '../../util/sportFilterKeys';

import css from './SportBar.module.css';

const SPORT_LABELS = PEAKUP_TOP_LEVEL_SPORT_LABELS;

const SPORT_EMOJI = {
  surf: '🏄',
  mtb: '🚵',
  tennis: '🎾',
  golf: '⛳️',
  climbing: '🧗',
  canyoning: '🪢',
  yoga: '🧘',
  skydive: '🪂',
  fitness: '💪',
  wakeboard: '🏄',
  // 🌊 visually differentiates Wakesurf from Wakeboard (🏄) and Surf (🏄)
  // in the chip row. Same disambiguation pattern used for Kitesurf (🪁
  // vs. Surf 🏄) — see CoachMapPage `WAKESURF_DISCIPLINE`.
  wakesurf: '🌊',
  kitesurf: '🪁',
  skateboard: '🛹',
  snowboard: '🏂',
  ski: '🎿',
  crosscountry: '🎿',
};

const TOPBAR_SPORT_ORDER = PEAKUP_TOP_LEVEL_SPORT_ORDER;

// Winter variants displayed in the legacy accordion mode of SportBar
// (`includeWinterVariants`). Labels mirror the canonical platform list
// in `PROFILE_SPORT_DISPLAY_LABELS`.
const WINTER_VARIANT_LABELS = PEAKUP_WINTER_VARIANT_LABELS;

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
 * Con `includeWinterVariants` le varianti ski/snowboard sono in un pannello accordion (Coach map legacy).
 *
 * Con `disciplines` la barra renderizza una main row compatta dichiarata dal
 * caller (CoachMap-only). Ogni chip può opzionalmente avere `variants[]`: se
 * presenti, viene mostrata una secondary row sotto la main row quando la
 * disciplina è attiva (parent o una delle sue varianti è il `value` corrente).
 * `TOPBAR_SPORT_ORDER` e l'accordion legacy `includeWinterVariants` vengono
 * ignorati in questa modalità. Gli altri consumer (LandingPage, Featured
 * Coaches, ecc.) non passano `disciplines` e non sono interessati.
 *
 * @param {Object} props
 * @param {string} props.value
 * @param {(v:string)=>void} props.onChange
 * @param {boolean} [props.showAll=true]
 * @param {string} [props.allLabel='All']
 * @param {boolean} [props.includeWinterVariants=false]
 * @param {boolean} [props.inTopbar=false]
 * @param {boolean} [props.winterBare=false]
 * @param {'default'|'coachMapMobileRail'} [props.variant='default'] — `coachMapMobileRail`: full-width chip rail for Coach Map sidebar (scroll + snap).
 * @param {Array<{key:string,label:string,emoji:string,variants?:Array<{key:string,label:string,emoji?:string}>}>} [props.disciplines]
 *        Main row chip list. Items with `variants` show a conditional
 *        secondary row when active. CoachMap-only.
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
    variant = 'default',
    disciplines = null,
  } = props;

  const [expandedWinter, setExpandedWinter] = useState(() =>
    initialWinterAccordion(value, includeWinterVariants)
  );

  useEffect(() => {
    // The flat-chip mode (`disciplines` prop) never expands the accordion.
    if (disciplines || !includeWinterVariants) {
      setExpandedWinter(null);
      return;
    }
    const v = normalizeSportValue(value);
    const inSnowboard = valueInKeySet(v, SNOWBOARD_SPORT_KEYS);
    const inSki = valueInKeySet(v, SKI_SPORT_KEYS);
    if (!v || (!inSnowboard && !inSki)) {
      setExpandedWinter(null);
    }
  }, [value, includeWinterVariants, disciplines]);

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

  // Currently active discipline in `disciplines` mode: the one whose parent
  // key, parent aliases, any variant key, or any variant aliases match
  // `value`. Drives the main-row active state for parents-with-variants and
  // the conditional secondary row visibility. `normalizeSportKey` already
  // strips spaces/hyphens/underscores so 'freeride-skiing' === 'freerideskiing';
  // aliases cover spelling differences like 'freerideski' vs 'freerideskiing'.
  const activeDiscipline = useMemo(() => {
    if (!disciplines) return null;
    const v = normalizeSportKey(value);
    if (!v) return null;
    const matchesKeyOrAlias = (k, aliases) => {
      if (k && normalizeSportKey(k) === v) return true;
      if (aliases && aliases.length) {
        return aliases.some(a => normalizeSportKey(a) === v);
      }
      return false;
    };
    return (
      disciplines.find(d => {
        if (matchesKeyOrAlias(d.key, d.aliases)) return true;
        return (d.variants || []).some(va => matchesKeyOrAlias(va.key, va.aliases));
      }) || null
    );
  }, [disciplines, value]);

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
        [css.rootCoachMapMobileRail]: variant === 'coachMapMobileRail',
      })}
    >
      <div
        className={classNames(css.wrap, {
          [css.wrapInTopbar]: inTopbar,
          [css.wrapCoachMapMobileRail]: variant === 'coachMapMobileRail',
        })}
      >
        <div
          className={classNames(css.inner, {
            [css.innerInTopbar]: inTopbar,
            [css.innerCoachMapMobileRail]: variant === 'coachMapMobileRail',
          })}
        >
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

          {disciplines
            ? disciplines.map(d => {
                const k = d.key;
                const hasVariants = !!(d.variants && d.variants.length);
                // Parents with variants are active when value matches the
                // parent OR any variant – mirrors the legacy snowboard/ski
                // family logic.
                const isActive = hasVariants
                  ? activeDiscipline && activeDiscipline.key === k
                  : normalizeSportKey(value) === normalizeSportKey(k);
                return (
                  <button
                    key={k}
                    type="button"
                    className={classNames(css.chip, isActive ? css.chipActive : null)}
                    onClick={() => onChange(k)}
                    aria-expanded={
                      hasVariants ? activeDiscipline && activeDiscipline.key === k : undefined
                    }
                    aria-label={d.label}
                  >
                    <span className={css.chipEmoji} aria-hidden="true">
                      {d.emoji || '🏅'}
                    </span>
                    <span className={css.chipLabel}>{d.label}</span>
                  </button>
                );
              })
            : null}
          {!disciplines && orderedEntries.map(([k, label]) => {
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

        {disciplines && activeDiscipline && activeDiscipline.variants && activeDiscipline.variants.length ? (
          <div className={css.accordionPanel} role="region" aria-label={activeDiscipline.label}>
            <div className={css.subinner}>
              {activeDiscipline.variants.map(va => {
                const isActive = normalizeSportKey(value) === normalizeSportKey(va.key);
                return (
                  <button
                    key={va.key}
                    type="button"
                    className={classNames(css.chipSm, isActive ? css.chipSmActive : null)}
                    onClick={() => onChange(va.key)}
                    aria-label={va.label}
                  >
                    {va.emoji ? (
                      <span className={css.chipEmoji} aria-hidden="true">
                        {va.emoji}
                      </span>
                    ) : null}
                    <span className={css.chipLabel}>{va.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {!disciplines && includeWinterVariants && expandedWinter === 'snowboard' && winterVariantEntriesSnowboard.length ? (
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

        {!disciplines && includeWinterVariants && expandedWinter === 'ski' && winterVariantEntriesSki.length ? (
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

