// Utilities for the district-level choropleth crime map.
// No turf/mapping-library dependency required — plain ray-casting point-in-polygon.

// ---- name normalization (dataset district names vs geojson district names) ----
const ALIASES = {
  bagalkot: 'bagalkote',
  chamarajanagar: 'chamarajanagara',
  chikmagalur: 'chikkamagaluru',
  chikkamagalur: 'chikkamagaluru',
  chikballapur: 'chikkaballapura',
  chikkaballapur: 'chikkaballapura',
  shimoga: 'shivamogga',
  tumkur: 'tumakuru',
  bellary: 'ballari',
  gulbarga: 'kalaburagi',
  bijapur: 'vijayapura',
  mysore: 'mysuru',
  bangalore: 'bengaluru',
  bangalore_urban: 'bengaluru urban',
  bangalore_rural: 'bengaluru rural'
};

export function normalizeDistrictName(name) {
  if (!name) return '';
  let key = name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (ALIASES[key]) key = ALIASES[key];
  // strip a single trailing vowel so "bagalkot" / "bagalkote" converge
  const stripped = key.replace(/[aeu]$/, '');
  return stripped;
}

export function matchDistrictFeature(name, geojson) {
  const target = normalizeDistrictName(name);
  return geojson.features.find(
    f => normalizeDistrictName(f.properties.district) === target
  ) || null;
}

// ---- point-in-polygon (ray casting), supports Polygon & MultiPolygon with holes ----
function inRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonCoords(lng, lat, polygonCoords) {
  // polygonCoords = [outerRing, hole1, hole2, ...]
  if (!inRing(lng, lat, polygonCoords[0])) return false;
  for (let h = 1; h < polygonCoords.length; h++) {
    if (inRing(lng, lat, polygonCoords[h])) return false; // inside a hole
  }
  return true;
}

export function pointInGeometry(lng, lat, geometry) {
  if (!geometry) return false;
  if (geometry.type === 'Polygon') {
    return pointInPolygonCoords(lng, lat, geometry.coordinates);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some(poly => pointInPolygonCoords(lng, lat, poly));
  }
  return false;
}

export function findDistrictForPoint(lat, lng, geojson) {
  for (const feature of geojson.features) {
    if (pointInGeometry(lng, lat, feature.geometry)) return feature;
  }
  return null;
}

// ---- bounding box helpers (Leaflet expects [[south,west],[north,east]] = [[minLat,minLng],[maxLat,maxLng]]) ----
function extendBoundsWithRing(bounds, ring) {
  for (const [lng, lat] of ring) {
    if (lat < bounds.minLat) bounds.minLat = lat;
    if (lat > bounds.maxLat) bounds.maxLat = lat;
    if (lng < bounds.minLng) bounds.minLng = lng;
    if (lng > bounds.maxLng) bounds.maxLng = lng;
  }
}

export function boundsOfGeometry(geometry) {
  const b = { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 };
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(ring => extendBoundsWithRing(b, ring));
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(poly => poly.forEach(ring => extendBoundsWithRing(b, ring)));
  }
  return [[b.minLat, b.minLng], [b.maxLat, b.maxLng]];
}

export function boundsOfFeatureCollection(geojson) {
  const b = { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 };
  geojson.features.forEach(f => {
    const [[minLat, minLng], [maxLat, maxLng]] = boundsOfGeometry(f.geometry);
    if (minLat < b.minLat) b.minLat = minLat;
    if (maxLat > b.maxLat) b.maxLat = maxLat;
    if (minLng < b.minLng) b.minLng = minLng;
    if (maxLng > b.maxLng) b.maxLng = maxLng;
  });
  return [[b.minLat, b.minLng], [b.maxLat, b.maxLng]];
}

// Largest outer ring of a feature's geometry, converted to [lat,lng] pairs — used to
// cut a "hole" in the world-mask so only Karnataka's silhouette is left visible.
export function outerRingLatLng(geometry) {
  let rings = [];
  if (geometry.type === 'Polygon') rings = [geometry.coordinates[0]];
  else if (geometry.type === 'MultiPolygon') rings = geometry.coordinates.map(p => p[0]);
  const largest = rings.reduce((a, b) => (b.length > a.length ? b : a), rings[0] || []);
  return largest.map(([lng, lat]) => [lat, lng]);
}

// ---- choropleth color scale (ColorBrewer "Reds", quantile-based) ----
const REDS = ['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#de2d26', '#a50f15'];

export function buildIntensityScale(counts) {
  const sorted = [...counts].filter(c => c != null).sort((a, b) => a - b);
  if (sorted.length === 0) return { colorFor: () => '#eeeeee', breaks: [] };
  const n = REDS.length;
  const breaks = [];
  for (let i = 1; i < n; i++) {
    const idx = Math.floor((i / n) * (sorted.length - 1));
    breaks.push(sorted[idx]);
  }
  function colorFor(count) {
    if (count == null) return '#eeeeee';
    for (let i = 0; i < breaks.length; i++) {
      if (count <= breaks[i]) return REDS[i];
    }
    return REDS[REDS.length - 1];
  }
  return { colorFor, breaks, max: sorted[sorted.length - 1], min: sorted[0] };
}

export { REDS };
