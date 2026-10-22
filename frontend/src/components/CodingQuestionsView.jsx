import { useState } from 'react';
import { api } from '../api';

const SUPPORTED_LANGUAGES = [
  'JavaScript',
  'Node.js',
  'Python',
  'Java',
  'TypeScript',
  'C#',
  'Go'
];

function CodingQuestionCard({ question }) {
  const defaultLang = question.language ? (question.language.charAt(0).toUpperCase() + question.language.slice(1)) : 'JavaScript';
  const [selectedLang, setSelectedLang] = useState(defaultLang);
  const [cache, setCache] = useState({
    [defaultLang.toLowerCase()]: question.solution,
    'javascript': question.solution,
    ...(question.converted_solutions || {})
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const difficultyColors = {
    easy: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    medium: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    hard: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' }
  };

  const diff = (question.difficulty || 'medium').toLowerCase();
  const badgeStyle = difficultyColors[diff] || difficultyColors.medium;

  async function handleLanguageChange(targetLang) {
    setSelectedLang(targetLang);
    setError('');

    const normTarget = targetLang.toLowerCase();
    if (cache[normTarget]) {
      // Returned from cache
      return;
    }

    setLoading(true);
    try {
      const res = await api(`/coding/${question.id}/convert`, {
        method: 'POST',
        body: { language: targetLang }
      });

      setCache((prev) => ({
        ...prev,
        [normTarget]: res.code
      }));
    } catch (err) {
      setError(err.message || `Failed to convert solution to ${targetLang}`);
    } finally {
      setLoading(false);
    }
  }

  const currentCode = cache[selectedLang.toLowerCase()] || question.solution;
  const examples = Array.isArray(question.examples) ? question.examples : [];
  const tests = Array.isArray(question.tests) ? question.tests : [];

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '18px',
        background: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}
    >
      {/* Header: Difficulty Badge & Question ID */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            background: badgeStyle.bg,
            color: badgeStyle.text,
            border: `1px solid ${badgeStyle.border}`,
            padding: '3px 10px',
            borderRadius: '4px'
          }}
        >
          {question.difficulty || 'Coding Challenge'}
        </span>

        {question.complexity && (
          <span style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            {question.complexity}
          </span>
        )}
      </div>

      {/* Problem Statement */}
      <h4 style={{ fontSize: '15px', color: '#0f172a', fontWeight: 600, lineHeight: 1.5, marginBottom: '14px' }}>
        {question.statement}
      </h4>

      {/* Examples */}
      {examples.length > 0 && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
            Examples:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {examples.map((ex, idx) => (
              <div key={idx} style={{ fontSize: '12.5px', color: '#334155' }}>
                <div><strong>Input: </strong><code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{ex.input}</code></div>
                <div><strong>Output: </strong><code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{ex.output}</code></div>
                {ex.explanation && <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}><em>{ex.explanation}</em></div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Cases */}
      {tests.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
            Test Cases:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {tests.map((t, idx) => (
              <span key={idx} style={{ fontSize: '12px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '4px', color: '#334155' }}>
                <code>{t.input}</code> → <code>{t.expected}</code>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Solution Header with Language Dropdown */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
            Model Solution
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor={`lang-select-${question.id}`} style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>
              Convert Language:
            </label>
            <select
              id={`lang-select-${question.id}`}
              value={selectedLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={loading}
              style={{
                fontSize: '12.5px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ background: '#f8fafc', border: '1px dashed #93c5fd', borderRadius: '6px', padding: '24px', textAlign: 'center', color: '#1e40af' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600 }}>
              ⚡ Converting solution to {selectedLang} via LLM...
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Preserving algorithm logic and time/space complexity
            </div>
          </div>
        )}

        {/* Error State with Retry */}
        {error && !loading && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '13px', color: '#dc2626' }}>
                <strong>Error: </strong>{error}
              </div>
              <button
                type="button"
                className="btn btn-secondary text-sm"
                onClick={() => handleLanguageChange(selectedLang)}
                style={{ padding: '3px 10px', fontSize: '12px' }}
              >
                🔄 Retry
              </button>
            </div>
          </div>
        )}

        {/* Code Display */}
        {!loading && (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', right: '10px', top: '8px', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {selectedLang}
            </div>
            <pre
              style={{
                background: '#0f172a',
                color: '#f8fafc',
                padding: '14px 16px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                overflowX: 'auto',
                margin: 0,
                lineHeight: 1.5
              }}
            >
              <code>{currentCode}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CodingQuestionsView({ codingQuestions = [] }) {
  if (!codingQuestions || codingQuestions.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b', marginTop: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>No coding challenges generated yet</div>
        <p style={{ fontSize: '13px', marginTop: '4px' }}>
          Algorithmic coding challenges (easy, medium, hard) tailored to candidate skills will appear here once analyzed.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>
            Coding Challenges ({codingQuestions.length})
          </h3>
          <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
            Practical algorithmic questions based on top candidate skills. Solutions can be converted to any language.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {codingQuestions.map((cq) => (
          <CodingQuestionCard key={cq.id} question={cq} />
        ))}
      </div>
    </div>
  );
}
