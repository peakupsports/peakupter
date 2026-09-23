
import React, { useEffect, useRef, useState } from 'react';

import { fetchPeakUpSurfFromApi } from '../util/api';
import css from './PeakUpSurfWidget.module.css';



const SURF_SPOTS = [
    // MAROCCO
    { name: 'Taghazout', lat: 30.55, lng: -9.76 },
    { name: 'Anchor Point', lat: 30.55, lng: -9.73 },
    { name: 'Imsouane', lat: 30.84, lng: -9.82 },
    { name: 'Boilers', lat: 30.62, lng: -9.88 },
  
    // FRANCIA
    { name: 'Hossegor', lat: 43.66, lng: -1.44 },
    { name: 'Biarritz', lat: 43.48, lng: -1.57 },
    { name: 'Lacanau', lat: 45.00, lng: -1.20 },
  
    // PORTOGALLO
    { name: 'Peniche', lat: 39.36, lng: -9.38 },
    { name: 'Nazaré', lat: 39.60, lng: -9.08 },
    { name: 'Ericeira', lat: 38.96, lng: -9.42 },
  
    // INDONESIA
    { name: 'Uluwatu', lat: -8.82, lng: 115.09 },
    { name: 'Padang Padang', lat: -8.81, lng: 115.10 },
    { name: 'Canggu', lat: -8.65, lng: 115.13 },
  ];
const PeakUpSurfWidget = () => {
    const [selectedSpot, setSelectedSpot] = useState(SURF_SPOTS[0]);

const [spotMenuOpen, setSpotMenuOpen] = useState(false);
const spotMenuRef = useRef(null);
  const [surf, setSurf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchPeakUpSurfFromApi({
            lat: selectedSpot.lat,
            lng: selectedSpot.lng,
          });

        if (!cancelled) {
          setSurf(data.current);
          setError(false);
        }
      } catch (err) {
        console.error('PeakUp Surf:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
}, [selectedSpot]);
if (loading && !surf) {
    return <p>Loading surf conditions...</p>;
  }

if (error || !surf) {
    return <p>Surf conditions unavailable.</p>;
  }

 
return (
    <section className={css.root}>
  
<div className={css.spotMenu} ref={spotMenuRef}>
  <button
    type="button"
    className={css.spotMenuButton}
    onClick={() => setSpotMenuOpen(!spotMenuOpen)}
    aria-expanded={spotMenuOpen}
  >
    <span>{selectedSpot.name}</span>
    <span className={css.spotArrow}>
      {spotMenuOpen ? '⌃' : '⌄'}
    </span>
  </button>

  {spotMenuOpen && (
    <div className={css.spotDropdown}>
      {[
        ['Marocco', ['Taghazout', 'Anchor Point', 'Imsouane', 'Boilers']],
        ['Francia', ['Hossegor', 'Biarritz', 'Lacanau']],
        ['Portogallo', ['Peniche', 'Nazaré', 'Ericeira']],
        ['Indonesia', ['Uluwatu', 'Padang Padang', 'Canggu']],
      ].map(([country, names]) => (
        <div key={country}>
          <div className={css.spotCountry}>{country}</div>

          {SURF_SPOTS.filter(spot => names.includes(spot.name)).map(spot => (
            <button
              type="button"
              key={spot.name}
              className={css.spotOption}
              onClick={() => {
                setSelectedSpot(spot);
                setLoading(true);
                setSpotMenuOpen(false);
              }}
            >
              {spot.name}
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
          {surf.wave_height ?? '--'} m
        </span>
      </div>
  
      <span className={css.separator}>|</span>
  
      <div className={css.item}>
        Swell
        <span className={css.value}>
          {surf.swell_wave_height ?? '--'} m
        </span>
      </div>
  
      <div className={css.item}>
        Periodo
        <span className={css.value}>
          {surf.swell_wave_period ?? '--'} s
        </span>
      </div>
  
      <div className={css.item}>
        🌡️
        <span className={css.value}>
          {surf.sea_surface_temperature ?? '--'} °C
        </span>
      </div>
    </section>
  );
};

export default PeakUpSurfWidget;