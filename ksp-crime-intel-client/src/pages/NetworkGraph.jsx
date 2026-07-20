import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { getNetworkGraph } from '../api';

const CONFIDENCE_COLORS = { high: '#c62828', medium: '#ef6c00', low: '#9e9e9e' };
const CASE_COLOR = '#1565c0';

export default function NetworkGraph() {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [minConfidence, setMinConfidence] = useState('low');
  const [selectedNode, setSelectedNode] = useState(null);
  const fgRef = useRef();

  useEffect(() => {
    getNetworkGraph()
      .then(data => { setGraphData(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading network graph...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#c62828' }}>Error: {error}</div>;
  if (!graphData) return null;

  const confidenceRank = { low: 0, medium: 1, high: 2 };
  const threshold = confidenceRank[minConfidence];

  const visibleOffenderIds = new Set(
    graphData.nodes
      .filter(n => n.type === 'offender' && confidenceRank[n.confidence] >= threshold)
      .map(n => n.id)
  );
  const visibleCaseIds = new Set();
  graphData.links.forEach(l => {
    if (l.type === 'accused_in_case' && visibleOffenderIds.has(l.source)) {
      visibleCaseIds.add(l.target);
    }
  });

  const filteredNodes = graphData.nodes.filter(
    n => n.type === 'case' ? visibleCaseIds.has(n.id) : visibleOffenderIds.has(n.id)
  );
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredLinks = graphData.links.filter(
    l => filteredNodeIds.has(l.source) && filteredNodeIds.has(l.target)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', background: '#fff' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Criminological Network & Link Analysis</h1>
        <p style={{ margin: '0.25rem 0 0.75rem', color: '#666' }}>
          {graphData.totalRepeatOffenders} probable repeat offenders identified across {graphData.totalAccused} accused records —
          name + age-proximity matching, not confirmed identity
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>Minimum confidence:</span>
            {['low', 'medium', 'high'].map(level => (
              <button
                key={level}
                onClick={() => setMinConfidence(level)}
                style={{
                  padding: '0.3rem 0.75rem', borderRadius: 16, border: `1px solid ${CONFIDENCE_COLORS[level]}`,
                  background: minConfidence === level ? CONFIDENCE_COLORS[level] : '#fff',
                  color: minConfidence === level ? '#fff' : CONFIDENCE_COLORS[level],
                  cursor: 'pointer', fontSize: '0.8rem', textTransform: 'capitalize'
                }}
              >
                {level}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#666' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: CONFIDENCE_COLORS.high, marginRight: 4 }}></span>High confidence (4+ cases)</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: CONFIDENCE_COLORS.medium, marginRight: 4 }}></span>Medium (3 cases)</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: CONFIDENCE_COLORS.low, marginRight: 4 }}></span>Low (2 cases)</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: CASE_COLOR, marginRight: 4 }}></span>Case</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <ForceGraph2D
            ref={fgRef}
            graphData={{ nodes: filteredNodes, links: filteredLinks }}
            nodeLabel={n => n.type === 'offender' ? `${n.label} (${n.confidence} confidence)` : `${n.label} — ${n.crimeHead}`}
            nodeColor={n => n.type === 'offender' ? CONFIDENCE_COLORS[n.confidence] : CASE_COLOR}
            nodeVal={n => n.type === 'offender' ? 6 : 3}
            linkColor={l => l.type === 'co_accused' ? '#c62828' : '#ccc'}
            linkWidth={l => l.type === 'co_accused' ? 2 : 1}
            onNodeClick={setSelectedNode}
            cooldownTicks={100}
          />
        </div>

        {selectedNode && (
          <div style={{ width: 280, borderLeft: '1px solid #e0e0e0', padding: '1.25rem', background: '#fafafa', overflowY: 'auto' }}>
            <button onClick={() => setSelectedNode(null)} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            {selectedNode.type === 'offender' ? (
              <>
                <h3 style={{ marginTop: 0 }}>{selectedNode.label}</h3>
                <p style={{ color: CONFIDENCE_COLORS[selectedNode.confidence], fontWeight: 600, textTransform: 'capitalize' }}>
                  {selectedNode.confidence} confidence match
                </p>
                <p style={{ fontSize: '0.85rem', color: '#666' }}>
                  Linked across multiple cases via name and approximate age match. Click connected case nodes to see details.
                </p>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>{selectedNode.label}</h3>
                <p><strong>Crime type:</strong> {selectedNode.crimeHead}</p>
                <p><strong>District:</strong> {selectedNode.district}</p>
                <p><strong>Date:</strong> {selectedNode.date}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}