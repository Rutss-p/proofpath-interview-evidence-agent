import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export default function Consent() {
  const { token } = useParams();
  const [scope, setScope] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [agree, setAgree] = useState(false);
  const [repos, setRepos] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/consent/' + token)
      .then((d) => {
        setScope(d.scope);
        setCandidateName(d.candidate_name);
        if (d.already_agreed) {
          setDone('processing');
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || 'Invalid or expired consent token');
        setLoading(false);
      });
  }, [token]);

  async function submit(e) {
    if (e) e.preventDefault();
    if (!agree) {
      return setError('You must check the agreement box to provide consent.');
    }
    setError('');
    try {
      const urls = repos
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const r = await api('/consent/' + token, {
        method: 'POST',
        body: { agree: true, repo_urls: urls }
      });
      setDone(r.status);
    } catch (e) {
      setError(e.message);
    }
  }

  async function withdraw() {
    if (!window.confirm('Are you sure you want to withdraw consent? Your candidate profile and all extracted information will be permanently deleted.')) return;
    try {
      await api('/consent/' + token + '/withdraw', { method: 'POST' });
      setDone('withdrawn');
    } catch (e) {
      setError(e.message);
    }
  }

  async function decline() {
    try {
      const r = await api('/consent/' + token, {
        method: 'POST',
        body: { agree: false, repo_urls: [] }
      });
      setDone(r.status);
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '640px', margin: '48px auto' }} className="card">
        <p style={{ color: '#64748b' }}>Validating consent request...</p>
      </div>
    );
  }

  if (done === 'consented' || done === 'processing') {
    return (
      <div style={{ maxWidth: '640px', margin: '48px auto' }} className="card">
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '44px', color: '#059669', marginBottom: '8px' }}>✓</div>
          <h2 style={{ color: '#0f172a', fontSize: '22px', marginBottom: '8px' }}>
            Consent Confirmed
          </h2>
          <p style={{ color: '#475569', fontSize: '14.5px', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            Thank you{candidateName ? `, ${candidateName}` : ''}. Your consent has been recorded. Our agent is analyzing your claims against the consented repositories to build tailored interview probes.
          </p>
          <button className="btn btn-danger text-sm" onClick={withdraw}>
            Withdraw Consent & Erase My Data
          </button>
        </div>
      </div>
    );
  }

  if (done === 'declined') {
    return (
      <div style={{ maxWidth: '640px', margin: '48px auto' }} className="card">
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '44px', color: '#dc2626', marginBottom: '8px' }}>✕</div>
          <h2 style={{ color: '#0f172a', fontSize: '22px', marginBottom: '8px' }}>
            Consent Declined
          </h2>
          <p style={{ color: '#475569', fontSize: '14.5px' }}>
            You have chosen to decline evidence review. No GitHub repos will be fetched and no automated claim verification will be run.
          </p>
        </div>
      </div>
    );
  }

  if (done === 'withdrawn') {
    return (
      <div style={{ maxWidth: '640px', margin: '48px auto' }} className="card">
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <h2 style={{ color: '#dc2626', fontSize: '22px', marginBottom: '8px' }}>
            Data Permanently Erased
          </h2>
          <p style={{ color: '#475569', fontSize: '14.5px' }}>
            Your consent has been withdrawn and your records have been permanently deleted from ProofPath.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '640px', margin: '48px auto' }}>
      <form onSubmit={submit} className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div className="brand-icon">P</div>
          <div>
            <h2 style={{ fontSize: '20px', color: '#0f172a' }}>Evidence Review Consent</h2>
            <div style={{ fontSize: '12.5px', color: '#64748b' }}>ProofPath Candidate Transparency Portal</div>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {candidateName && (
          <p style={{ fontSize: '14px', color: '#334155', marginBottom: '14px' }}>
            Candidate: <strong>{candidateName}</strong>
          </p>
        )}

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#4f46e5', letterSpacing: '0.04em', fontWeight: 700, marginBottom: '6px' }}>
            Transparency Scope Notice
          </div>
          <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.55 }}>
            {scope}
          </p>
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ marginTop: '3px' }}
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <span style={{ fontSize: '13.5px', color: '#0f172a', lineHeight: 1.45 }}>
              I agree to allow ProofPath to read my resume and examine the public GitHub repositories I choose to link below for interview preparation.
            </span>
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">
            Public GitHub Repositories to share (comma separated, max 5, optional):
          </label>
          <textarea
            rows={3}
            placeholder="e.g. https://github.com/myusername/my-service, https://github.com/myusername/my-web-app"
            value={repos}
            onChange={(e) => setRepos(e.target.value)}
          />
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Note: Only repositories you explicitly list here will be examined.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary" disabled={!agree}>
            Accept & Submit Consent
          </button>
          <button type="button" className="btn btn-secondary" onClick={decline}>
            Decline
          </button>
          <button type="button" className="btn btn-danger text-sm" onClick={withdraw}>
            Withdraw & Erase
          </button>
        </div>
      </form>
    </div>
  );
}
