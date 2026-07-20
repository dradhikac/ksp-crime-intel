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