import { useEffect, useState } from 'react';
import { api } from '../api';

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    api('/probes/metrics')
      .then(setMetrics)
      .catch((e) => console.log('Metrics not available yet:', e.message));
  }, []);

  if (!metrics) return null;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ fontSize: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊</span> Agent Learning & Probe Effectiveness
          </h3>
          <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
            Historical interviewer feedback dynamically prioritizes higher-rated probe formats.
          </p>
        </div>
        <span style={{ fontSize: '12px', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
          Adaptive Loop Active
        </span>
      </div>

      <div className="grid-2" style={{ marginBottom: '16px' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b' }}>Total Probes Created</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{metrics.total_probes}</div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b' }}>Evaluated Candidate Answers</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669', marginTop: '2px' }}>{metrics.evaluated_answers}</div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
            <th style={{ padding: '8px 10px', fontWeight: 600 }}>Probe Type</th>
            <th style={{ padding: '8px 10px', fontWeight: 600 }}>Generated</th>
            <th style={{ padding: '8px 10px', fontWeight: 600 }}>Rated Count</th>
            <th style={{ padding: '8px 10px', fontWeight: 600 }}>Average Usefulness</th>
          </tr>
        </thead>
        <tbody>
          {metrics.probe_types && metrics.probe_types.map((t) => (
            <tr key={t.type} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px', color: '#0f172a', fontWeight: 500 }}>
                {t.type === 'verified_mutation' ? '✓ Execution-Verified Mutation' : 'Scenario Probe'}
              </td>
              <td style={{ padding: '10px', color: '#64748b' }}>{t.total}</td>
              <td style={{ padding: '10px', color: '#64748b' }}>{t.rated_count}</td>
              <td style={{ padding: '10px' }}>
                {t.avg_usefulness ? (
                  <span style={{ color: '#d97706', fontWeight: 600 }}>
                    ★ {t.avg_usefulness} / 5.0
                  </span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>No ratings yet</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
