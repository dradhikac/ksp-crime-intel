import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { getStatsSummary } from '../api';

const CRIME_COLORS = {
  'Crimes Against Body': '#c62828',
  'Crimes Against Property': '#1565c0',
  'Crimes Against Women': '#ad1457',
  'Crimes Against Children': '#6a1b9a',
  'Economic Offences': '#ef6c00',
  'Cyber Crimes': '#00838f',
  'Crimes Against Public Order': '#558b2f',
  'Special & Local Laws': '#757575'
};

const KARNATAKA_CENTER = [14.7, 75.9];

export default function CrimeMap() {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);

  useEffect(() => {
    getStatsSummary()
      .then(data => {
        setPoints(data.hotspotPoints || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading map...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#c62828' }}>Error loading map: {error}</div>;

  const visiblePoints = activeFilter ? points.filter(p => p.crimeHead === activeFilter) : points;
  const crimeTypes = [...new Set(points.map(p => p.crimeHead))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', background: '#fff' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Crime Hotspot Map</h1>
        <p style={{ margin: '0.25rem 0 0.75rem', color: '#666' }}>
          {visiblePoints.length} of {points.length} cases shown — district-level clustering visible by dot density
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveFilter(null)}
            style={{
              padding: '0.3rem 0.75rem', borderRadius: 16, border: '1px solid #ccc',
              background: activeFilter === null ? '#1a2332' : '#fff',
              color: activeFilter === null ? '#fff' : '#333', cursor: 'pointer', fontSize: '0.8rem'
            }}
          >
            All
          </button>
          {crimeTypes.map(type => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              style={{
                padding: '0.3rem 0.75rem', borderRadius: 16, border: `1px solid ${CRIME_COLORS[type] || '#999'}`,
                background: activeFilter === type ? (CRIME_COLORS[type] || '#999') : '#fff',
                color: activeFilter === type ? '#fff' : (CRIME_COLORS[type] || '#333'),
                cursor: 'pointer', fontSize: '0.8rem'
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <MapContainer center={KARNATAKA_CENTER} zoom={7} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {visiblePoints.map((p, i) => (
            <CircleMarker
              key={i}
              center={[p.lat, p.lng]}
              radius={6}
              pathOptions={{
                color: CRIME_COLORS[p.crimeHead] || '#666',
                fillColor: CRIME_COLORS[p.crimeHead] || '#666',
                fillOpacity: 0.6,
                weight: 1
              }}
            >
              <Popup>{p.crimeHead}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}