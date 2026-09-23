
import React, { useEffect, useRef, useState } from 'react';

import { fetchPeakUpSurfFromApi } from '../util/api';

import css from './PeakUpSurfWidget.module.css';

const SURF_SPOTS = [
  // MAROCCO
  { name: 'Taghazout', country: 'Marocco', lat: 30.55, lng: -9.76 },
  { name: 'Anchor Point', country: 'Marocco', lat: 30.545, lng: -9.731 },
  { name: 'Imsouane', country: 'Marocco', lat: 30.843, lng: -9.82 },
  { name: 'Boilers', country: 'Marocco', lat: 30.62, lng: -9.88 },
  { name: 'Safi', country: 'Marocco', lat: 32.3, lng: -9.25 },

  // PORTOGALLO
  { name: 'Peniche', country: 'Portogallo', lat: 39.36, lng: -9.38 },
  { name: 'Nazaré', country: 'Portogallo', lat: 39.602, lng: -9.071 },
  { name: 'Ericeira', country: 'Portogallo', lat: 38.963, lng: -9.417 },
  { name: 'Supertubos', country: 'Portogallo', lat: 39.345, lng: -9.364 },

  // FRANCIA
  { name: 'Hossegor', country: 'Francia', lat: 43.66, lng: -1.44 },
  { name: 'Biarritz', country: 'Francia', lat: 43.483, lng: -1.567 },
  { name: 'Lacanau', country: 'Francia', lat: 45.0, lng: -1.2 },

  // INDONESIA
  { name: 'Uluwatu', country: 'Indonesia', lat: -8.815, lng: 115.088 },
  { name: 'Padang Padang', country: 'Indonesia', lat: -8.811, lng: 115.103 },

  // SUDAFRICA
  { name: 'Jeffreys Bay', country: 'Sudafrica', lat: -34.05, lng: 24.93 },
  { name: 'Muizenberg', country: 'Sudafrica', lat: -34.11, lng: 18.47 },
  { name: 'Dungeons', country: 'Sudafrica', lat: -34.06, lng: 18.34 },
  { name: 'Durban', country: 'Sudafrica', lat: -29.86, lng: 31.04 },

  // COSTA RICA
  { name: 'Santa Teresa', country: 'Costa Rica', lat: 9.64, lng: -85.17 },
  { name: 'Pavones', country: 'Costa Rica', lat: 8.39, lng: -83.14 },
  { name: 'Tamarindo', country: 'Costa Rica', lat: 10.3, lng: -85.84 },
  { name: 'Playa Hermosa', country: 'Costa Rica', lat: 9.57, lng: -84.61 },

  // HAWAII
  { name: 'Pipeline', country: 'Hawaii', lat: 21.665, lng: -158.052 },
  { name: 'Waikiki', country: 'Hawaii', lat: 21.279, lng: -157.831 },
  { name: 'Sunset Beach', country: 'Hawaii', lat: 21.679, lng: -158.04 },
  { name: 'Jaws', country: 'Hawaii', lat: 20.943, lng: -156.301 },

  // ITALIA
  { name: 'Capo Mannu', country: 'Italia', lat: 40.03, lng: 8.38 },
  { name: 'Buggerru', country: 'Italia', lat: 39.4, lng: 8.4 },
  { name: 'Varazze', country: 'Italia', lat: 44.36, lng: 8.58 },
  { name: 'Levanto', country: 'Italia', lat: 44.17, lng: 9.61 },

  // AUSTRALIA
  { name: 'Bells Beach', country: 'Australia', lat: -38.37, lng: 144.28 },
  { name: 'Snapper Rocks', country: 'Australia', lat: -28.16, lng: 153.55 },
  { name: 'Margaret River', country: 'Australia', lat: -33.98, lng: 114.99 },
  { name: 'Bondi', country: 'Australia', lat: -33.89, lng: 151.27 },
];

const SURF_WEBCAMS = {
    Taghazout: [
      {
        name: 'Panorama Point',
        url: 'https://www.surfline.com/surf-report/panorama-point/640a158899dd441bfaf8c663',
        thumbnailUrl: '',
      },
    ],
    'Anchor Point': [],
    Imsouane: [],
    Boilers: [],
    Safi: [],
  };
const COUNTRIES = [
  'Marocco',
  'Portogallo',
  'Francia',
  'Indonesia',
  'Sudafrica',
  'Costa Rica',
  'Hawaii',
  'Italia',
  'Australia',
];

const PeakUpSurfWidget = () => {
  const [selectedSpot, setSelectedSpot] = useState(SURF_SPOTS[0]);
  const [spotMenuOpen, setSpotMenuOpen] = useState(false);
  const [expandedCountry, setExpandedCountry] = useState(null);

  const [surf, setSurf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const spotMenuRef = useRef(null);
  const [selectedWebcamIndex, setSelectedWebcamIndex] = useState(0);

const webcams = SURF_WEBCAMS[selectedSpot.name] || [];
useEffect(() => {
    setSelectedWebcamIndex(0);
  }, [selectedSpot]);

  // Chiude il menu quando si clicca fuori.
  useEffect(() => {
    const handleClickOutside = event => {
      if (
        spotMenuRef.current &&
        !spotMenuRef.current.contains(event.target)
      ) {
        setSpotMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Carica le previsioni dello spot selezionato.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const data = await fetchPeakUpSurfFromApi({
          lat: selectedSpot.lat,
          lng: selectedSpot.lng,
        });

        if (!cancelled) {
          if (data && data.current) {
            setSurf(data.current);
          } else {
            setError(true);
          }
        }
      } catch (err) {
        console.error('PeakUp Surf:', err);

        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedSpot]);

  const toggleMenu = () => {
    if (!spotMenuOpen) {
      setExpandedCountry(selectedSpot.country);
    }

    setSpotMenuOpen(!spotMenuOpen);
  };

  const selectSpot = spot => {
    setSelectedSpot(spot);
    setSpotMenuOpen(false);
    setExpandedCountry(null);
  };

  return (
    <section className={css.root}>
      <div className={css.spotMenu} ref={spotMenuRef}>
        <button
          type="button"
          className={css.spotMenuButton}
          onClick={toggleMenu}
          aria-expanded={spotMenuOpen}
        >
          <span>{selectedSpot.name}</span>

          <span className={css.spotArrow}>
            {spotMenuOpen ? '⌃' : '⌄'}
          </span>
        </button>

        {spotMenuOpen && (
          <div className={css.spotDropdown}>
            {COUNTRIES.map(country => (
              <div key={country}>
                <button
                  type="button"
                  className={css.spotCountry}
                  onClick={() => {
                    setExpandedCountry(
                      expandedCountry === country ? null : country
                    );
                  }}
                  aria-expanded={expandedCountry === country}
                >
                  <span>{country}</span>

                  <span>
                    {expandedCountry === country ? '⌃' : '⌄'}
                  </span>
                </button>

                {expandedCountry === country &&
                  SURF_SPOTS.filter(
                    spot => spot.country === country
                  ).map(spot => (
                    <button
                      type="button"
                      key={spot.name}
                      className={css.spotOption}
                      onClick={() => selectSpot(spot)}
                    >
                      {spot.name}
                      {selectedSpot.name === spot.name ? ' ✓' : ''}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={css.item}>
        🏄 <span className={css.value}>{selectedSpot.name}</span>
      </div>

      <span className={css.separator}>|</span>

      <div className={css.item}>
        🌊 Onde
        <span className={css.value}>
          {loading ? '...' : error ? '--' : surf?.wave_height ?? '--'} m
        </span>
      </div>

      <span className={css.separator}>|</span>

      <div className={css.item}>
        Swell
        <span className={css.value}>
          {loading ? '...' : error ? '--' : surf?.swell_wave_height ?? '--'} m
        </span>
      </div>

      <div className={css.item}>
        Periodo
        <span className={css.value}>
          {loading ? '...' : error ? '--' : surf?.swell_wave_period ?? '--'} s
        </span>
      </div>

      <div className={css.item}>
        🌡️
        <span className={css.value}>
          {loading
            ? '...'
            : error
              ? '--'
              : surf?.sea_surface_temperature ?? '--'} °C
        </span>
      </div>
 
{webcams.length > 0 && (
  <div className={css.surfLive}>
    <div className={css.webcamHeader}>
      <strong>{webcams[selectedWebcamIndex]?.name}</strong>

      {webcams.length > 1 && (
        <div className={css.webcamArrows}>
          <button
            type="button"
            onClick={() =>
              setSelectedWebcamIndex(
                (selectedWebcamIndex - 1 + webcams.length) % webcams.length
              )
            }
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() =>
              setSelectedWebcamIndex(
                (selectedWebcamIndex + 1) % webcams.length
              )
            }
          >
            ›
          </button>
        </div>
      )}
    </div>

    {webcams[selectedWebcamIndex]?.thumbnailUrl && (
      <img
        src={webcams[selectedWebcamIndex].thumbnailUrl}
        alt={webcams[selectedWebcamIndex].name}
        className={css.surfLiveImage}
      />
    )}

    <a
      href={webcams[selectedWebcamIndex]?.url}
      target="_blank"
      rel="noopener noreferrer"
      className={css.liveOverlay}
    >
      VIEW LIVE CAM ↗
    </a>
  </div>
)}
    </section>
  );
};

export default PeakUpSurfWidget;