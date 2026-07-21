import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
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

const STATUS_COLORS = {
  'Charge Sheeted': '#2e7d32',
  'Closed': '#1565c0',
  'Under Investigation': '#f9a825',
  'Pending Court Trial': '#ef6c00',
  'Undetected': '#c62828',
  'False Case': '#757575'
};

function ProtectedRoute({ user, children }) {
  if (user === undefined) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Sidebar() {
  const location = useLocation();
  const navItemStyle = (path) => ({
    color: '#fff',
    textDecoration: 'none',
    opacity: location.pathname === path ? 1 : 0.6,
    fontWeight: location.pathname === path ? 700 : 400
  });

  return (
    <aside style={{ width: 220, background: '#1a2332', color: '#fff', padding: '1.5rem 1rem', flexShrink: 0 }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>KSP Crime Intel</h2>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <Link to="/" style={navItemStyle('/')}>Dashboard</Link>
        <Link to="/map" style={navItemStyle('/map')}>Crime Map</Link>
        <Link to="/predictive" style={navItemStyle('/predictive')}>Predictive Intel</Link>
        <span style={{ opacity: 0.3 }}>Predictive Intel (Module 7)</span>
      </nav>
    </aside>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div style={{
      background: highlight ? '#fdecea' : '#fff',
      border: `1px solid ${highlight ? '#f5c2c0' : '#e0e0e0'}`,
      borderRadius: 8, padding: '1.25rem'
    }}>
      <div style={{ fontSize: '0.85rem', color: '#666' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: highlight ? '#c62828' : '#1a2332' }}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem' }}>
      <h3 style={{ marginTop: 0, fontSize: '1rem' }}>{title}</h3>
      {children}
    </div>
  );
}

function TopBar({ user, onLogout }) {
  const roleName = user?.role_details?.role_name || 'Unknown Role';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', background: '#fff' }}>
      <div>
        <strong>{user.first_name || user.email_id}</strong>
        <span style={{ color: '#666', marginLeft: '0.75rem', fontSize: '0.85rem' }}>Role: {roleName}</span>
      </div>
      <button onClick={onLogout}>Log Out</button>
    </div>
  );
}

function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getStatsSummary()
      .then(data => { setStats(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading dashboard...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#c62828' }}>Error loading dashboard: {error}</div>;
  if (!stats) return <div style={{ padding: '2rem' }}>No stats available.</div>;

  const avgPerDistrict = stats.byDistrict.length > 0 ? stats.totalCases / stats.byDistrict.length : 0;
  const redZoneDistricts = stats.byDistrict.filter(d => d.count > avgPerDistrict * 2);

  return (
    <div style={{ padding: '2rem', background: '#f5f6f8', flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Total Cases" value={stats.totalCases} />
        <StatCard label="Districts Covered" value={stats.byDistrict.length} />
        <StatCard label="Top Crime Type" value={stats.byCrimeHead[0]?.name || '—'} />
        <StatCard label="Red-Zone Districts" value={redZoneDistricts.length} highlight={redZoneDistricts.length > 0} />
      </div>

      {redZoneDistricts.length > 0 && (
        <div style={{ background: '#fdecea', border: '1px solid #f5c2c0', borderRadius: 8, padding: '1rem', marginBottom: '2rem' }}>
          <strong style={{ color: '#c62828' }}>⚠ Emerging Trend Alert:</strong>{' '}
          {redZoneDistricts.map(d => d.name).join(', ')} {redZoneDistricts.length === 1 ? 'is' : 'are'} running at more than 2x the average district case volume.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <ChartCard title="Cases by District">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.byDistrict.slice(0, 10)} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1a2332" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cases by Crime Category">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.byCrimeHead}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={70} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#c62828" />
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
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Case Registration Trend">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.byMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#1565c0" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function AppShell({ user }) {
  const navigate = useNavigate();
  function handleLogout() {
    logout().then(() => navigate('/login'));
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/map" element={<CrimeMap />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/network" element={<NetworkGraph />} />
          <Route path="/predictive" element={<PredictiveIntel />} />
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