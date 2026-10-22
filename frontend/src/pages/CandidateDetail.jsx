import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getUserRole } from '../api';
import ClaimTable from '../components/ClaimTable';
import QuestionsView from '../components/QuestionsView';
import CodingQuestionsView from '../components/CodingQuestionsView';

export default function CandidateDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const role = getUserRole();

  const load = () => {
    api('/candidates/' + id)
      .then(setData)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, [id]);

  const status = data ? data.status : '';
  useEffect(() => {
    if (status !== 'processing' && status !== 'consented' && !analyzing) return;
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [status, analyzing]);

  async function requestConsent() {
    setError('');
    try {
      const r = await api('/candidates/' + id + '/consent-request', { method: 'POST' });
      setLink(r.link);
      setCopied(false);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  }

  async function triggerAnalysis() {
    setError('');
    setAnalyzing(true);
    try {
      await api('/candidates/' + id + '/analyze', { method: 'POST' });
      setTimeout(load, 1500);
    } catch (e) {
      setError(e.message);
    }
    setAnalyzing(false);
  }

  async function eraseCandidate() {
    if (!window.confirm('Permanently erase this candidate and all associated claims, evidence, and probes?')) return;
    try {
      await api('/candidates/' + id, { method: 'DELETE' });
      nav('/');
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <div className="card"><p style={{ color: '#64748b' }}>Loading candidate briefing...</p></div>;

  const getStatusLabel = (s) => {
    switch (s) {
      case 'new': return 'New';
      case 'consent_pending': return 'Awaiting Consent';
      case 'processing': return 'Processing Claims & Codebase...';
      case 'consented': return 'Consent Given';
      case 'analyzed': return 'Briefing Ready';
      case 'failed': return 'Analysis Failed';
      case 'declined': return 'Consent Declined';
      default: return s;
    }
  };

  return (
    <div>
      {/* Top Briefing Header */}
      <div className="card">
        <div className="card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className={`badge status-${data.status}`}>
                {getStatusLabel(data.status)}
              </span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                ID: #{data.id}
              </span>
              {data.email && (
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  • {data.email}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '24px', color: '#0f172a' }}>
              {data.full_name}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              Technical Interview Briefing & Evidence Verification
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary text-sm" onClick={requestConsent}>
              🔗 Create Consent Link
            </button>
            <button
              className="btn btn-primary text-sm"
              onClick={triggerAnalysis}
              disabled={data.status === 'processing' || analyzing}
            >
              {data.status === 'processing' || analyzing ? 'Analyzing...' : '⚡ Re-run Verification'}
            </button>
            {(role === 'admin' || role === 'recruiter') && (
              <button className="btn btn-danger text-sm" onClick={eraseCandidate}>
                Erase
              </button>
            )}
          </div>
        </div>

        {/* Failed Error Message Banner */}
        {data.status === 'failed' && (
          <div className="error-banner" style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <strong>Analysis Failed: </strong>
              {data.error_message || 'An error occurred during verification.'}
            </div>
            <button className="btn btn-secondary text-sm" onClick={triggerAnalysis}>
              🔄 Retry Analysis
            </button>
          </div>
        )}

        {/* Processing Banner */}
        {data.status === 'processing' && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '14px 16px', marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '20px' }}>⏳</div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e40af' }}>
                Automated Verification & Question Generation in Progress...
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                Extracting resume claims, fetching GitHub repositories, running deterministic claim verification, and generating tailored interview and coding questions. Polling for completion...
              </div>
            </div>
          </div>
        )}

        {/* Link Box */}
        {link && (
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 16px', marginTop: '14px' }}>
            <div style={{ fontSize: '12.5px', color: '#1e40af', fontWeight: 600, marginBottom: '6px' }}>
              Candidate Consent Link (One-Time Signed Access):
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                readOnly
                value={link}
                style={{ flex: 1, minWidth: '240px', background: '#ffffff', fontSize: '13px', color: '#334155' }}
              />
              <button type="button" className="btn btn-secondary text-sm" onClick={copyLink}>
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
              <a href={link} target="_blank" rel="noreferrer" className="btn btn-primary text-sm" style={{ whiteSpace: 'nowrap' }}>
                Open Portal ↗
              </a>
            </div>
          </div>
        )}

        {/* Consented Sources */}
        {data.sources && data.sources.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '8px' }}>
              Consented Repositories ({data.sources.length})
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {data.sources.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    background: '#f1f5f9',
                    color: '#1e40af',
                    border: '1px solid #cbd5e1',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    textDecoration: 'none'
                  }}
                >
                  📁 {s.url.replace('https://github.com/', '')}
                  {s.meta && s.meta.language && (
                    <span style={{ color: '#64748b' }}>({s.meta.language})</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 1. Claims Table with Status, Reason and Evidence */}
      {/* <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '17px', color: '#0f172a' }}>
            Claim Verification & Evidence ({data.claims ? data.claims.length : 0})
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Evaluated by Deterministic Code (LLM Never Decides Claim Status)
          </span>
        </div>
        <ClaimTable claims={data.claims} onReload={load} />
      </div> */}

      {/* 2. Questions Grouped by Beginner, Intermediate, and Advanced */}
      <QuestionsView questions={data.questions} />

      {/* 3. Coding Questions with Multilingual Conversion Dropdown */}
      <CodingQuestionsView codingQuestions={data.coding_questions} />
    </div>
  );
}
