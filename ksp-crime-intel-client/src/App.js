import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { checkAuth, logout } from './auth';
import { getStatsSummary } from './api';
import Login from './pages/Login';

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
  return (
    <aside style={{ width: 220, background: '#1a2332', color: '#fff', padding: '1.5rem 1rem' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>KSP Crime Intel</h2>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <span style={{ fontWeight: 700 }}>Dashboard</span>
        <span style={{ opacity: 0.5 }}>Crime Map (Module 5)</span>
        <span style={{ opacity: 0.5 }}>Network Analysis (Module 6)</span>
        <span style={{ opacity: 0.5 }}>Predictive Intel (Module 7)</span>
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

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getStatsSummary()
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  function handleLogout() {
    logout().then(() => navigate('/login'));
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading dashboard...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#c62828' }}>Error loading dashboard: {error}</div>;
  if (!stats) return <div style={{ padding: '2rem' }}>No stats available.</div>;
  const roleName = user?.role_details?.role_name || 'Unknown Role';
  const avgPerDistrict = stats.byDistrict.length > 0
    ? stats.totalCases / stats.byDistrict.length
    : 0;
  const redZoneDistricts = stats.byDistrict.filter(d => d.count > avgPerDistrict * 2);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '2rem', background: '#f5f6f8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1>Welcome, {user.first_name || user.email_id}</h1>
            <p style={{ color: '#666' }}>Role: {roleName}</p>
          </div>
          <button onClick={handleLogout}>Log Out</button>
        </div>

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
      </main>
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
          path="/"
          element={
            <ProtectedRoute user={user}>
              <Dashboard user={user} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );

 
}