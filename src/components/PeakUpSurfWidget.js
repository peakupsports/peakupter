
import React, { useEffect, useState } from 'react';

import { fetchPeakUpSurfFromApi } from '../util/api';
import css from './PeakUpSurfWidget.module.css';
const PeakUpSurfWidget = () => {
  const [surf, setSurf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
      
const data = await fetchPeakUpSurfFromApi({
    lat: 30.55,
    lng: -9.76,
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
  }, []);

  if (loading) return <p>Loading surf conditions...</p>;

  if (error || !surf) {
    return <p>Surf conditions unavailable.</p>;
  }

 
return (
    <section className={css.root}>
      <div className={css.item}>
        🏄 <span className={css.value}>Taghazout</span>
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