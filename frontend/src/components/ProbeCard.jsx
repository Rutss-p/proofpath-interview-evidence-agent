import { useState } from 'react';
import { api } from '../api';

export default function ProbeCard({ probe, onChange }) {
  const [answer, setAnswer] = useState(probe.answer || '');
  const [result, setResult] = useState(
    probe.next_question ? { next_question: probe.next_question, gaps: 'Saved from prior evaluation' } : null
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rated, setRated] = useState(probe.usefulness || null);

  let artifact = null;
  try {
    artifact = probe.artifact ? JSON.parse(probe.artifact) : null;
  } catch (e) {}

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const res = await api('/probes/' + probe.id + '/answer', {
        method: 'POST',
        body: { answer_text: answer }
      });
      setResult(res);
      if (onChange) onChange();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function rate(n) {
    try {
      await api('/probes/' + probe.id + '/feedback', {
        method: 'POST',
        body: { usefulness: n }
      });
      setRated(n);
      if (onChange) onChange();
    } catch (e) {
      console.error(e);
    }
  }

  const depthDescriptions = [
    'Level 0 - Vague / Inaccurate (Confidence -15%)',
    'Level 1 - Minimal understanding (Confidence -5%)',
    'Level 2 - Competent explanation (Confidence +10%)',
    'Level 3 - Deep architectural mastery (Confidence +20%)'
  ];

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
        <span className={`badge ${probe.verified ? 'verified-badge' : 'status-new'}`}>
          {probe.verified ? '✓ Execution-Verified Probe' : 'Scenario Probe'}
        </span>
        {rated && (
          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
            ★ Rated {rated}/5 usefulness
          </span>
        )}
      </div>

      <p style={{ fontSize: '14.5px', fontWeight: 600, color: '#0f172a', marginBottom: '8px', lineHeight: 1.45 }}>
        {probe.question}
      </p>

      {/* Verified Mutation AST Diff */}
      {artifact && artifact.diff && (
        <div style={{ margin: '12px 0' }}>
          <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500, marginBottom: '4px' }}>
            Injected Mutation ({artifact.file} • {artifact.change}):
          </div>
          <div className="diff-box">
            {artifact.diff.split('\n').map((line, idx) => {
              let cls = 'diff-line';
              if (line.startsWith('+') && !line.startsWith('+++')) cls += ' add';
              else if (line.startsWith('-') && !line.startsWith('---')) cls += ' del';
              return (
                <div key={idx} className={cls}>
                  {line}
                </div>
              );
            })}
          </div>
          {artifact.test_output && (
            <details style={{ marginTop: '6px' }}>
              <summary style={{ fontSize: '12px', color: '#64748b', cursor: 'pointer', fontWeight: 500 }}>
                View sandbox test failure trace
              </summary>
              <pre style={{ fontSize: '11.5px', marginTop: '4px', background: '#ffffff' }}>
                {artifact.test_output}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Rubric */}
      {probe.rubric && (
        <details style={{ margin: '10px 0', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '8px 12px', borderRadius: '6px' }}>
          <summary style={{ fontSize: '12.5px', color: '#5b21b6', cursor: 'pointer', fontWeight: 600 }}>
            Scoring Rubric & Expected Concepts
          </summary>
          <p style={{ fontSize: '13px', color: '#334155', marginTop: '6px', lineHeight: 1.45 }}>
            {probe.rubric}
          </p>
        </details>
      )}

      {/* Interviewer Answer Input */}
      <div style={{ marginTop: '12px' }}>
        <label className="form-label" style={{ fontSize: '12.5px' }}>
          Candidate Answer:
        </label>
        <textarea
          rows={3}
          placeholder="Paste or transcribe the candidate's technical response here..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={busy || !answer.trim()}
          >
            {busy ? 'Evaluating Answer...' : 'Evaluate Answer'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', fontSize: '12.5px', color: '#64748b' }}>
            <span>Rate usefulness:</span>
            <div className="rating-group">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`rate-btn ${rated === n ? 'selected' : ''}`}
                  onClick={() => rate(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="error-banner" style={{ marginTop: '12px' }}>{error}</p>}

      {/* Adaptive Evaluation Result */}
      {result && (
        <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '12px 14px', marginTop: '12px' }}>
          {result.depth !== undefined && (
            <div style={{ fontSize: '13px', color: '#3730a3', fontWeight: 700, marginBottom: '4px' }}>
              Evaluated Depth: {depthDescriptions[result.depth] || `Level ${result.depth}`}
            </div>
          )}
          {result.gaps && (
            <p style={{ fontSize: '13px', color: '#1e293b', marginBottom: '6px' }}>
              <strong style={{ color: '#b45309' }}>Identified Gap: </strong>{result.gaps}
            </p>
          )}
          {result.next_question && (
            <div style={{ fontSize: '13px', color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '8px 10px', borderRadius: '6px' }}>
              <strong>Adaptive Follow-up: </strong>{result.next_question}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
