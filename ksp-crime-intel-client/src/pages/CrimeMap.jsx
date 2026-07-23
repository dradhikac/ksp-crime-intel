import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Polygon, useMap } from 'react-leaflet';
import { getStatsSummary } from '../api';
import karnatakaDistricts from '../data/karnataka-districts.json';
import {
  matchDistrictFeature,
  findDistrictForPoint,
  boundsOfGeometry,
  boundsOfFeatureCollection,
  outerRingLatLng,
  buildIntensityScale
} from '../districtUtils';

const NAVY = '#1a2332';
const GOLD = '#c9a227';

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

// A world-covering rectangle with every district's outer ring punched out as a
// hole, so the base map is only visible inside Karnataka's silhouette.
const WORLD_RING = [
  [85, -179], [85, 179], [-85, 179], [-85, -179]
];

function MapController({ overallBounds, selectedBounds }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(overallBounds, { padding: [10, 10] });
    map.setMaxBounds(map.getBounds().pad(0.15));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    if (selectedBounds) {
      map.flyToBounds(selectedBounds, { padding: [40, 40], duration: 0.6 });
    } else {
      map.flyToBounds(overallBounds, { padding: [10, 10], duration: 0.6 });
    }
  }, [map, selectedBounds, overallBounds]);

  return null;
}

function DistrictPanel({ info, onClose, onReset }) {
  if (!info) return null;
  const { name, total, rank, totalDistricts, breakdown } = info;
  const maxCount = breakdown.length ? breakdown[0].count : 1;

  return (
    <div
      style={{
        position: 'absolute', top: 16, right: 16, bottom: 16, width: 320,
        background: '#fff', borderRadius: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
        border: `1px solid ${NAVY}22`, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', zIndex: 1000
      }}
    >
      <div style={{ background: NAVY, color: '#fff', padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.06em', opacity: 0.7, textTransform: 'uppercase' }}>
              District Profile
            </div>
            <h2 style={{ margin: '0.15rem 0 0', fontSize: '1.25rem' }}>{name}</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', opacity: 0.8 }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{total}</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>total cases</div>
          </div>
          {rank != null && (
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: GOLD }}>#{rank}</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>of {totalDistricts} districts</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '1rem 1.1rem', overflowY: 'auto', flex: 1 }}>
        <h3 style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Crime-type breakdown
        </h3>
        {breakdown.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.85rem' }}>No geolocated case detail available for this district.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {breakdown.map(b => (
              <div key={b.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 3 }}>
                  <span>{b.name}</span>
                  <span style={{ fontWeight: 600 }}>{b.count} · {b.pct}%</span>
                </div>
                <div style={{ background: '#eee', borderRadius: 4, height: 7, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(b.count / maxCount) * 100}%`, height: '100%',
                      background: CRIME_COLORS[b.name] || '#999', borderRadius: 4
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {breakdown.length > 0 && (
          <div style={{ marginTop: '1.1rem', padding: '0.75rem', background: '#f5f6f8', borderRadius: 8, fontSize: '0.8rem', color: '#444' }}>
            <strong>{breakdown[0].name}</strong> is the leading crime category here, accounting for{' '}
            <strong>{breakdown[0].pct}%</strong> of sampled cases in {name}.
          </div>
        )}
      </div>

      <div style={{ padding: '0.85rem 1.1rem', borderTop: '1px solid #eee' }}>
        <button
          onClick={onReset}
          style={{
            width: '100%', padding: '0.55rem', borderRadius: 6, border: `1px solid ${NAVY}`,
            background: '#fff', color: NAVY, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
          }}
        >
          ↺ Reset to full state view
        </button>
      </div>
    </div>
  );
}

function Legend({ scale }) {
  if (!scale.breaks.length) return null;
  const labels = ['Low', 'Below avg.', 'Average', 'Above avg.', 'High', 'Critical'];
  const swatches = ['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#de2d26', '#a50f15'];
  return (
    <div
      style={{
        position: 'absolute', bottom: 16, left: 16, background: '#fff', borderRadius: 8,
        boxShadow: '0 4px 14px rgba(0,0,0,0.15)', padding: '0.75rem 0.9rem', zIndex: 1000, fontSize: '0.75rem'
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: NAVY }}>Case volume intensity</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {swatches.map((c, i) => (
          <div key={c} style={{ textAlign: 'center' }}>
            <div style={{ width: 26, height: 12, background: c, border: '1px solid rgba(0,0,0,0.1)' }} />
            <div style={{ fontSize: '0.6rem', color: '#666', marginTop: 2, maxWidth: 34 }}>{labels[i]}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '0.5rem', color: '#888' }}>Tap a district for full details</div>
    </div>
  );
}

export default function CrimeMap() {
  const [points, setPoints] = useState([]);
  const [byDistrict, setByDistrict] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // selectedKey is always the GeoJSON's own `district` property — the single
  // consistent identifier used to look up geometry, totals, and breakdowns.
  const [selectedKey, setSelectedKey] = useState(null);
  const geoLayerRef = useRef(null);

  useEffect(() => {
    getStatsSummary()
      .then(data => {
        setPoints(data.hotspotPoints || []);
        setByDistrict(data.byDistrict || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Map GeoJSON district key -> { displayName, total } using the dataset's own names.
  const districtTotals = useMemo(() => {
    const map = {};
    byDistrict.forEach(d => {
      const feature = matchDistrictFeature(d.name, karnatakaDistricts);
      if (feature) {
        map[feature.properties.district] = { name: d.name, total: d.count };
      } else {
        console.warn(`CrimeMap: could not match district "${d.name}" to a boundary`);
      }
    });
    return map;
  }, [byDistrict]);

  // Per-district crime-type breakdown, derived from the geolocated case sample
  // via point-in-polygon (independent of how the backend names districts).
  const districtBreakdowns = useMemo(() => {
    const map = {};
    points.forEach(p => {
      const feature = findDistrictForPoint(p.lat, p.lng, karnatakaDistricts);
      if (!feature) return;
      const key = feature.properties.district;
      if (!map[key]) map[key] = {};
      map[key][p.crimeHead] = (map[key][p.crimeHead] || 0) + 1;
    });
    return map;
  }, [points]);

  const colorScale = useMemo(
    () => buildIntensityScale(Object.values(districtTotals).map(d => d.total)),
    [districtTotals]
  );

  // Ranking keyed the same way as everything else, for the "#N of 30" stat.
  const rankedKeys = useMemo(
    () => Object.entries(districtTotals).sort((a, b) => b[1].total - a[1].total).map(([key]) => key),
    [districtTotals]
  );

  const overallBounds = useMemo(() => boundsOfFeatureCollection(karnatakaDistricts), []);

  const maskRings = useMemo(
    () => [WORLD_RING, ...karnatakaDistricts.features.map(f => outerRingLatLng(f.geometry))],
    []
  );

  if (loading) return <div style={{ padding: '2rem' }}>Loading map...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#c62828' }}>Error loading map: {error}</div>;

  const selectedFeature = selectedKey
    ? karnatakaDistricts.features.find(f => f.properties.district === selectedKey)
    : null;
  const selectedBounds = selectedFeature ? boundsOfGeometry(selectedFeature.geometry) : null;

  let panelInfo = null;
  if (selectedKey) {
    const totalsEntry = districtTotals[selectedKey];
    const rawBreakdown = districtBreakdowns[selectedKey] || {};
    const breakdownTotal = Object.values(rawBreakdown).reduce((s, v) => s + v, 0) || 1;
    const breakdown = Object.entries(rawBreakdown)
      .map(([crimeName, count]) => ({ name: crimeName, count, pct: ((count / breakdownTotal) * 100).toFixed(0) }))
      .sort((a, b) => b.count - a.count);
    const rankIdx = rankedKeys.indexOf(selectedKey);
    panelInfo = {
      name: totalsEntry ? totalsEntry.name : selectedFeature.properties.district,
      total: totalsEntry ? totalsEntry.total : 0,
      rank: rankIdx >= 0 ? rankIdx + 1 : null,
      totalDistricts: rankedKeys.length,
      breakdown
    };
  }

  function style(feature) {
    const key = feature.properties.district;
    const entry = districtTotals[key];
    const isSelected = selectedKey === key;
    return {
      fillColor: entry ? colorScale.colorFor(entry.total) : '#e0e0e0',
      fillOpacity: isSelected ? 0.95 : 0.82,
      color: isSelected ? GOLD : '#7a1616',
      weight: isSelected ? 3 : 0.8
    };
  }

  function onEachFeature(feature, layer) {
    const key = feature.properties.district;
    const entry = districtTotals[key];
    layer.bindTooltip(
      `<strong>${key}</strong><br/>${entry ? entry.total + ' cases' : 'No data'}`,
      { sticky: true }
    );
    layer.on({
      click: () => setSelectedKey(key),
      mouseover: e => e.target.setStyle({ weight: 2.5, color: GOLD }),
      mouseout: () => geoLayerRef.current && geoLayerRef.current.resetStyle(layer)
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', background: '#fff' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', color: NAVY }}>Karnataka Crime Intensity Map</h1>
        <p style={{ margin: '0.25rem 0 0', color: '#666' }}>
          {byDistrict.length} districts reporting · {byDistrict.reduce((s, d) => s + d.count, 0)} total cases —
          tap any district to zoom in and view its full crime-type breakdown
        </p>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={[14.7, 75.9]}
          zoom={7}
          minZoom={6}
          maxZoom={11}
          style={{ height: '100%', width: '100%', background: '#dce8f0' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {/* Masks out everything outside Karnataka so only the state is visible */}
          <Polygon
            positions={maskRings}
            pathOptions={{ fillColor: '#dce8f0', fillOpacity: 1, stroke: false, fillRule: 'evenodd' }}
            interactive={false}
          />
          <GeoJSON
            ref={geoLayerRef}
            data={karnatakaDistricts}
            style={style}
            onEachFeature={onEachFeature}
          />
          <MapController overallBounds={overallBounds} selectedBounds={selectedBounds} />
        </MapContainer>

        <Legend scale={colorScale} />
        <DistrictPanel
          info={panelInfo}
          onClose={() => setSelectedKey(null)}
          onReset={() => setSelectedKey(null)}
        />
      </div>
    </div>
  );
}
