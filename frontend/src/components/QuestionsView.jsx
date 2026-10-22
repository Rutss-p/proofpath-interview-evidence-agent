import { useState } from 'react';

export default function QuestionsView({ questions = [] }) {
  const [activeTab, setActiveTab] = useState('all');

  if (!questions || questions.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>No interview questions generated yet</div>
        <p style={{ fontSize: '13px', marginTop: '4px' }}>
          Questions at beginner, intermediate, and advanced levels will appear here automatically once claims are analyzed.
        </p>
      </div>
    );
  }

  const levels = ['all', 'beginner', 'intermediate', 'advanced'];

  const filtered = activeTab === 'all'
    ? questions
    : questions.filter(q => (q.level || '').toLowerCase() === activeTab);

  const getLevelBadgeColor = (level) => {
    switch ((level || '').toLowerCase()) {
      case 'beginner': return { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' };
      case 'intermediate': return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' };
      case 'advanced': return { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' };
      default: return { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };
    }
  };

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>
            Technical Interview Questions ({questions.length})
          </h3>
          <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
            Tailored questions generated per verified skill across Beginner, Intermediate, and Advanced tiers
          </p>
        </div>

        {/* Level filter tabs */}
        <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          {levels.map((lvl) => {
            const count = lvl === 'all'
              ? questions.length
              : questions.filter(q => (q.level || '').toLowerCase() === lvl).length;
            const isActive = activeTab === lvl;
            return (
              <button
                key={lvl}
                onClick={() => setActiveTab(lvl)}
                style={{
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#0f172a' : '#64748b',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '12.5px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  textTransform: 'capitalize'
                }}
              >
                {lvl} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filtered.map((q) => {
          const colors = getLevelBadgeColor(q.level);
          const keyPoints = Array.isArray(q.key_points) ? q.key_points : [];

          return (
            <div
              key={q.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              {/* Top metadata */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    padding: '3px 10px',
                    borderRadius: '4px'
                  }}
                >
                  {q.level}
                </span>

                {q.skill && (
                  <span
                    style={{
                      fontSize: '12px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600
                    }}
                  >
                    Skill: {q.skill}
                  </span>
                )}
              </div>

              {/* Question text */}
              <h4 style={{ fontSize: '15px', color: '#0f172a', fontWeight: 600, lineHeight: 1.45, marginBottom: '12px' }}>
                {q.text}
              </h4>

              {/* Model Answer */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
                  Model Answer:
                </div>
                <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.55 }}>
                  {q.model_answer}
                </p>
              </div>

              {/* Key points checklist */}
              {keyPoints.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
                    Key Points Checklist:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12.5px', color: '#334155', lineHeight: 1.5 }}>
                    {keyPoints.map((kp, idx) => (
                      <li key={idx} style={{ marginBottom: '3px' }}>
                        {kp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
