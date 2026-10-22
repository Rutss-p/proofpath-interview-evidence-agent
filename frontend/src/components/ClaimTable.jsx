import ProbeCard from './ProbeCard';

export default function ClaimTable({ claims = [], onReload }) {
  if (!claims.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>No claims extracted yet</div>
        <p style={{ fontSize: '13px', marginTop: '4px' }}>
          Once the candidate provides consent, the agent automatically extracts claims and verifies them against the consented repositories.
        </p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'supported': return '#059669';
      case 'contradicted': return '#dc2626';
      default: return '#d97706';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'supported': return '✓ Supported';
      case 'contradicted': return '⚠️ Contradicted';
      default: return 'ℹ Unverifiable';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {claims.map((c) => {
        const confPercent = Math.round((c.confidence || 0.5) * 100);
        return (
          <div className="card" key={c.id} style={{ margin: 0 }}>
            <div className="card-header" style={{ marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span className={`badge ${c.status}`} style={{ fontWeight: 600 }}>
                    {getStatusIcon(c.status)}
                  </span>
                  <span style={{ fontSize: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px', color: '#334155', fontWeight: 600 }}>
                    Skill: {c.skill || 'General'}
                  </span>
                  {c.role && (
                    <span style={{ fontSize: '12px', background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                      Role: {c.role}
                    </span>
                  )}
                  {c.years && (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {c.years} {c.years === 1 ? 'year' : 'years'} claimed
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Importance: {'★'.repeat(c.importance || 3)}
                  </span>
                </div>
                <h4 style={{ fontSize: '15.5px', color: '#0f172a', fontWeight: 600, lineHeight: 1.4 }}>
                  {c.text}
                </h4>
              </div>
            </div>

            {/* Confidence Bar */}
            <div className="confidence-container">
              <span style={{ fontSize: '12px', color: '#64748b', minWidth: '70px', fontWeight: 500 }}>
                Confidence:
              </span>
              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{
                    width: `${confPercent}%`,
                    backgroundColor: getStatusColor(c.status)
                  }}
                />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: getStatusColor(c.status), minWidth: '36px' }}>
                {confPercent}%
              </span>
            </div>

            {/* Explainable Reason */}
            {c.reason && (
              <div style={{ background: '#f8fafc', borderLeft: `3px solid ${getStatusColor(c.status)}`, padding: '10px 14px', borderRadius: '0 6px 6px 0', marginTop: '10px' }}>
                <p style={{ fontSize: '12.5px', color: '#334155', margin: 0, lineHeight: 1.45 }}>
                  <strong style={{ color: '#0f172a' }}>Assessment Reason: </strong>{c.reason}
                </p>
              </div>
            )}

            {/* Evidence Used */}
            <div style={{ background: '#f1f5f9', borderRadius: '6px', padding: '10px 14px', marginTop: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '4px' }}>
                Evidence Used:
              </div>
              <div style={{ fontSize: '12.5px', color: c.evidence && c.evidence !== 'None' ? '#0f172a' : '#64748b', fontFamily: 'monospace' }}>
                {c.evidence || 'No shared repository evidence found (missing evidence is not treated as false)'}
              </div>
            </div>

            {/* Probes for this Claim (if any) */}
            {c.probes && c.probes.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#4f46e5', fontWeight: 700, marginBottom: '8px' }}>
                  Interview Probes ({c.probes.length})
                </div>
                {c.probes.map((p) => (
                  <ProbeCard key={p.id} probe={p} onChange={onReload} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
