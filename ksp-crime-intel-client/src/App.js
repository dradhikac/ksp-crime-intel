import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { checkAuth, logout } from './auth';
import { getStatsSummary } from './api';
import Login from './pages/Login';
import CrimeMap from './pages/CrimeMap';
import NetworkGraph from './pages/NetworkGraph';
import PredictiveIntel from './pages/PredictiveIntel';

const NAVY = '#0f1c2e';
const NAVY_LIGHT = '#16273d';
const GOLD = '#c9a227';
const BG = '#eef1f5';
const BORDER = '#e3e6ec';

const STATUS_COLORS = {
  'Charge Sheeted': '#2e7d32',
  'Closed': '#1565c0',
  'Under Investigation': '#f9a825',
  'Pending Court Trial': '#ef6c00',
  'Undetected': '#c62828',
  'False Case': '#757575'
};

// ---------------------------------------------------------------------------
// Icons (inline SVG, stroke-based, no external icon library needed)
// ---------------------------------------------------------------------------
const iconProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

const IconDashboard = () => (
  <svg {...iconProps}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
);
const IconMap = () => (
  <svg {...iconProps}><path d="M9 3 3 5.5v15L9 18l6 2.5L21 18V3l-6 2.5L9 3Z" /><path d="M9 3v15" /><path d="M15 5.5v15" /></svg>
);
const IconNetwork = () => (
  <svg {...iconProps}><circle cx="5" cy="6" r="2.2" /><circle cx="19" cy="6" r="2.2" /><circle cx="12" cy="18" r="2.2" /><path d="M6.9 7.2 10.5 16" /><path d="M17.1 7.2 13.5 16" /><path d="M7.2 6h9.6" /></svg>
);
const IconPredictive = () => (
  <svg {...iconProps}><path d="M3 17 9 11l4 4 8-8" /><path d="M15 7h6v6" /></svg>
);
const IconLogout = () => (
  <svg {...iconProps}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
);
const IconDownload = () => (
  <svg {...iconProps}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
);
const IconAlert = () => (
  <svg {...iconProps} width={20} height={20}><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.9 18a1.8 1.8 0 0 0 1.55 2.7h17.1A1.8 1.8 0 0 0 22.1 18L13.7 3.9a1.8 1.8 0 0 0-3.4 0Z" /></svg>
);
const IconShield = () => (
  <svg {...iconProps} width={22} height={22} stroke="none" fill={GOLD}><path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Z" /></svg>
);

function ProtectedRoute({ user, children }) {
  if (user === undefined) {
    return <div style={{ padding: '2rem', color: '#666' }}>Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
function NavItem({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.7rem',
        padding: '0.65rem 0.9rem', borderRadius: 8, textDecoration: 'none',
        color: active ? '#fff' : '#a9b4c4',
        background: active ? 'rgba(201,162,39,0.14)' : 'transparent',
        borderLeft: active ? `3px solid ${GOLD}` : '3px solid transparent',
        fontWeight: active ? 600 : 500,
        fontSize: '0.9rem',
        transition: 'background 0.15s, color 0.15s'
      }}
    >
      <span style={{ display: 'flex', color: active ? GOLD : '#7d8aa0' }}>{icon}</span>
      {label}
    </Link>
  );
}

function Sidebar() {
  const location = useLocation();
  const items = [
    { to: '/', label: 'Dashboard', icon: <IconDashboard /> },
    { to: '/map', label: 'Crime Map', icon: <IconMap /> },
    { to: '/network', label: 'Network Analysis', icon: <IconNetwork /> },
    { to: '/predictive', label: 'Predictive Intel', icon: <IconPredictive /> }
  ];

  return (
    <aside style={{ width: 240, background: NAVY, color: '#fff', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '1.4rem 1.25rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%', background: NAVY_LIGHT,
          border: `1.5px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <IconShield />
        </div>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.02em' }}>KSP Crime Intel</div>
          <div style={{ fontSize: '0.65rem', color: '#8291a5', letterSpacing: '0.05em', textTransform: 'uppercase' }}>SCRB Analytics Platform</div>
        </div>
      </div>

      <nav style={{ padding: '1.1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <div style={{ fontSize: '0.65rem', color: '#647087', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.9rem', marginBottom: '0.3rem' }}>
          Intelligence
        </div>
        {items.map(item => (
          <NavItem key={item.to} {...item} active={location.pathname === item.to} />
        ))}
      </nav>

      <div style={{ marginTop: 'auto', padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.68rem', color: '#647087' }}>
        Government of Karnataka<br />State Crime Records Bureau
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------
function TopBar({ user, onLogout, title, subtitle }) {
  const roleName = user?.role_details?.role_name || 'Unknown Role';
  const displayName = user.first_name || user.email_id;
  const initials = (displayName || '?').slice(0, 2).toUpperCase();

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '1rem 1.75rem', borderBottom: `1px solid ${BORDER}`, background: '#fff'
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.15rem', color: NAVY, fontWeight: 700 }}>{title}</h1>
        {subtitle && <div style={{ fontSize: '0.8rem', color: '#8791a1', marginTop: 2 }}>{subtitle}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', background: NAVY, color: GOLD,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1f2937' }}>{displayName}</div>
            <span style={{
              fontSize: '0.65rem', color: '#3d5a80', background: '#eaf1fb',
              padding: '0.1rem 0.45rem', borderRadius: 20, fontWeight: 600, letterSpacing: '0.03em'
            }}>
              {roleName}
            </span>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 0.9rem', borderRadius: 7, border: `1px solid ${BORDER}`,
            background: '#fff', color: '#4b5563', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600
          }}
        >
          <IconLogout /> Log Out
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard building blocks
// ---------------------------------------------------------------------------
function StatCard({ label, value, highlight, accent }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '1.1rem 1.25rem',
      borderLeft: `4px solid ${highlight ? '#c62828' : accent || NAVY}`,
      boxShadow: '0 1px 2px rgba(16,24,40,0.04)'
    }}>
      <div style={{ fontSize: '0.72rem', color: '#8791a1', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.85rem', fontWeight: 700, color: highlight ? '#c62828' : NAVY, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '1.25rem', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
      <div style={{ marginBottom: '0.85rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: NAVY, fontWeight: 700 }}>{title}</h3>
        {subtitle && <div style={{ fontSize: '0.75rem', color: '#8791a1', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function downloadReport() {
  window.open('/server/case-api/reports/case-summary', '_blank');
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getStatsSummary()
      .then(data => { setStats(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: '2rem', color: '#666' }}>Loading dashboard...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#c62828' }}>Error loading dashboard: {error}</div>;
  if (!stats) return <div style={{ padding: '2rem', color: '#666' }}>No stats available.</div>;

  const avgPerDistrict = stats.byDistrict.length > 0 ? stats.totalCases / stats.byDistrict.length : 0;
  const redZoneDistricts = stats.byDistrict.filter(d => d.count > avgPerDistrict * 2);

  return (
    <div style={{ padding: '1.75rem 2rem', background: BG, flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: NAVY, fontWeight: 700 }}>Crime Intelligence Overview</h2>
          <p style={{ margin: '0.2rem 0 0', color: '#8791a1', fontSize: '0.85rem' }}>
            Statewide case statistics across {stats.byDistrict.length} districts
          </p>
        </div>
        <button
          onClick={downloadReport}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.1rem', borderRadius: 8, border: 'none',
            background: NAVY, color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            boxShadow: '0 1px 3px rgba(15,28,46,0.25)'
          }}
        >
          <IconDownload /> Download Intelligence Report
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total Cases" value={stats.totalCases} accent="#1565c0" />
        <StatCard label="Districts Covered" value={stats.byDistrict.length} accent="#2e7d32" />
        <StatCard label="Top Crime Type" value={stats.byCrimeHead[0]?.name || '—'} accent={GOLD} />
        <StatCard label="Red-Zone Districts" value={redZoneDistricts.length} highlight={redZoneDistricts.length > 0} />
      </div>

      {redZoneDistricts.length > 0 && (
        <div style={{
          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
          background: '#fdecea', border: '1px solid #f5c2c0', borderRadius: 10, padding: '0.9rem 1.1rem', marginBottom: '1.5rem'
        }}>
          <span style={{ color: '#c62828', marginTop: 2 }}><IconAlert /></span>
          <div style={{ fontSize: '0.85rem', color: '#7a2a26' }}>
            <strong style={{ color: '#c62828' }}>Emerging Trend Alert:</strong>{' '}
            {redZoneDistricts.map(d => d.name).join(', ')} {redZoneDistricts.length === 1 ? 'is' : 'are'} running at more than 2x the average district case volume.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <ChartCard title="Cases by District" subtitle="Top 10 districts by volume">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.byDistrict.slice(0, 10)} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#8791a1' }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: '#4b5563' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: '0.8rem' }} />
              <Bar dataKey="count" fill={NAVY} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cases by Crime Category">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.byCrimeHead}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8791a1' }} angle={-20} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11, fill: '#8791a1' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: '0.8rem' }} />
              <Bar dataKey="count" fill="#c62828" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Case Status Breakdown">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={stats.byStatus} dataKey="count" nameKey="name" outerRadius={100} label>
                {stats.byStatus.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || '#999'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: '0.8rem' }} />
              <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Case Registration Trend">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8791a1' }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: '#8791a1' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: '0.8rem' }} />
              <Line type="monotone" dataKey="count" stroke="#1565c0" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

const PAGE_META = {
  '/': { title: 'Dashboard', subtitle: 'Statewide crime intelligence summary' },
  '/map': { title: 'Crime Map', subtitle: 'District-level hotspot visualization' },
  '/network': { title: 'Network Analysis', subtitle: 'Offender and case link analysis' },
  '/predictive': { title: 'Predictive Intel', subtitle: 'Risk scoring, anomalies & copilot' }
};

function AppShell({ user }) {
  const location = useLocation();
  const meta = PAGE_META[location.pathname] || { title: 'KSP Crime Intel', subtitle: '' };

  function handleLogout() {
    logout().then(() => {
      window.location.href = '/app/login';
    });
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar user={user} onLogout={handleLogout} title={meta.title} subtitle={meta.subtitle} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<CrimeMap />} />
          <Route path="/network" element={<NetworkGraph />} />
          <Route path="/predictive" element={<PredictiveIntel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    checkAuth().then(setUser);
  }, []);

  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute user={user}>
              <AppShell user={user} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}