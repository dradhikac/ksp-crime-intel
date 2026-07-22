import { useEffect, useState } from 'react';
import { getRiskScores, getAnomalies, askCopilot } from '../api';

const RISK_COLORS = { High: '#c62828', Normal: '#2e7d32' };
const SEVERITY_COLORS = { high: '#c62828', medium: '#ef6c00' };

function formatMessage(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

export default function PredictiveIntel() {
  const [riskData, setRiskData] = useState(null);
  const [anomalyData, setAnomalyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Ask me anything about the case data — e.g. "How many cases involve dowry death?" or "Which district has the most cyber crime cases?"' }
  ]);
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    Promise.all([getRiskScores(), getAnomalies()])
      .then(([risk, anomalies]) => {
        setRiskData(risk);
        setAnomalyData(anomalies);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  async function handleAsk() {
    if (!input.trim() || asking) return;
    const question = input.trim();
    setMessages(m => [...m, { role: 'user', text: question }]);
    setInput('');
    setAsking(true);
    try {
      const result = await askCopilot(question);
      setMessages(m => [...m, { role: 'assistant', text: result.answer }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', text: `Sorry, something went wrong: ${err.message}` }]);
    } finally {
      setAsking(false);
    }
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading predictive intelligence...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#c62828' }}>Error: {error}</div>;

  const highRiskDistricts = riskData.results.filter(r => r.riskLevel === 'High');

  return (
    <div style={{ padding: '2rem', background: '#f5f6f8', flex: 1, overflowY: 'auto' }}>
      <h1 style={{ marginTop: 0 }}>Predictive Intelligence</h1>
      <p style={{ color: '#666' }}>Risk scoring for {riskData.month} — {riskData.method}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1.25rem' }}>
          <h3 style={{ marginTop: 0 }}>District Risk Levels</h3>
          {highRiskDistricts.length === 0 ? (
            <p style={{ color: '#666' }}>No districts currently flagged High risk.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                  <th style={{ padding: '0.5rem 0' }}>District</th>
                  <th>Level</th>
                  <th>Why</th>
                </tr>
              </thead>
              <tbody>
                {highRiskDistricts.map(r => (
                  <tr key={r.district} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '0.5rem 0' }}>{r.district}</td>
                    <td>
                      <span style={{ color: RISK_COLORS[r.riskLevel], fontWeight: 600 }}>{r.riskLevel}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#555' }}>{r.reasons.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1.25rem' }}>
          <h3 style={{ marginTop: 0 }}>Anomaly Detection ({anomalyData.totalAnomalies})</h3>
          {anomalyData.anomalies.map((a, i) => (
            <div key={i} style={{ padding: '0.6rem 0', borderBottom: '1px solid #f5f5f5' }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: SEVERITY_COLORS[a.severity], marginRight: 8
              }}></span>
              <span style={{ fontSize: '0.85rem' }}>{a.detail}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1.25rem' }}>
        <h3 style={{ marginTop: 0 }}>Crime Copilot</h3>
        <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? '#1a2332' : '#f0f2f5',
              color: m.role === 'user' ? '#fff' : '#222',
              borderRadius: 12, padding: '0.6rem 0.9rem', maxWidth: '75%', fontSize: '0.9rem'
            }}>
              {formatMessage(m.text)}
            </div>
          ))}
          {asking && <div style={{ color: '#999', fontSize: '0.85rem' }}>Thinking...</div>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder="Ask about the case data..."
            style={{ flex: 1, padding: '0.6rem', border: '1px solid #ccc', borderRadius: 6 }}
          />
          <button onClick={handleAsk} disabled={asking}>Ask</button>
        </div>
      </div>
    </div>
  );
}