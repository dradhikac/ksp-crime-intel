const API_BASE = '/server/case-api';

export async function getMeta() {
  const res = await fetch(`${API_BASE}/meta`);
  return res.json();
}

export async function getStatsSummary() {
  const res = await fetch(`${API_BASE}/stats/summary`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load stats');
  }
  return data;
}

export async function getCases(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/cases?${query}`);
  return res.json();
}

export async function getCaseDetail(id) {
  const res = await fetch(`${API_BASE}/cases/${id}`);
  return res.json();
}

export async function getNetworkGraph() {
  const res = await fetch(`${API_BASE}/network/graph`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load network graph');
  return data;
}

export async function getRiskScores() {
  const res = await fetch(`${API_BASE}/ml/risk-scores`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load risk scores');
  return data;
}

export async function getAnomalies() {
  const res = await fetch(`${API_BASE}/ml/anomalies`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load anomalies');
  return data;
}

export async function askCopilot(query) {
  const res = await fetch(`${API_BASE}/copilot/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Copilot request failed');
  return data;
}