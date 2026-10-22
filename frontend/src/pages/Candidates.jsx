import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUserRole } from '../api';
import MetricsDashboard from '../components/MetricsDashboard';
import RoleGuidelines from '../components/RoleGuidelines';

export default function Candidates() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const role = getUserRole();

  const load = () => {
    api('/candidates')
      .then(setRows)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  async function add(e) {
    e.preventDefault();
    if (!file) return setError('Please select a resume file (.pdf or .txt)');
    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('full_name', name);
    if (email) form.append('email', email);
    form.append('resume', file);

    try {
      await api('/candidates', { method: 'POST', form });
      setName('');
      setEmail('');
      setFile(null);
      load();
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
  }

  async function createSyntheticCandidate() {
    setUploading(true);
    setError('');
    const sampleText = `Alex Chen - Senior Full-Stack Engineer
Email: alex.chen@example.com
Summary:
- 4 years of Python backend development building microservices with FastAPI and Docker.
- 15 years of production Kubernetes operations across multi-region clusters.
- Strong proficiency in React, TypeScript, and PostgreSQL database optimization.
- Open source contributor to developer utilities and testing suites.`;

    const blob = new Blob([sampleText], { type: 'text/plain' });
    const syntheticFile = new File([blob], 'alex_chen_resume.txt', { type: 'text/plain' });

    const form = new FormData();
    form.append('full_name', 'Alex Chen (Synthetic Demo)');
    form.append('email', 'alex.chen@example.com');
    form.append('resume', syntheticFile);

    try {
      await api('/candidates', { method: 'POST', form });
      load();
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
  }

  const statusCounts = rows.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const filteredRows = rows.filter((c) => {
    const matchesSearch = c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function eraseCandidate(id, fullName) {
    if (!window.confirm(`Permanently erase candidate "${fullName}" and all associated claims, questions, and evidence?`)) {
      return;
    }
    try {
      await api('/candidates/' + id, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const getStatusLabel = (s) => {
    switch (s) {
      case 'new': return 'New';
      case 'consent_pending': return 'Awaiting Consent';
      case 'processing': return 'Processing';
      case 'consented': return 'Consent Given';
      case 'analyzed': return 'Briefing Ready';
      case 'failed': return 'Failed';
      case 'declined': return 'Consent Declined';
      default: return s;
    }
  };

  return (
    <div>
      {/* Top HR Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px 20px', margin: 0 }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Total Candidates</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{rows.length}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', margin: 0 }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Awaiting Consent</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#d97706', marginTop: '4px' }}>{statusCounts['consent_pending'] || 0}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', margin: 0 }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Verified Briefings</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>{statusCounts['analyzed'] || 0}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', margin: 0 }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Declined</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#dc2626', marginTop: '4px' }}>{statusCounts['declined'] || 0}</div>
        </div>
      </div>

      {/* Recruiter / Admin: Upload candidate resume */}
      {(role === 'recruiter' || role === 'admin' || !role) && (
        <form onSubmit={add} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '17px', color: '#0f172a' }}>Register Candidate & Upload Resume</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                Claims will be extracted once the candidate consents to repository review.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary text-sm"
              onClick={createSyntheticCandidate}
              disabled={uploading}
            >
              + Quick Synthetic Candidate
            </button>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                placeholder="Candidate Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Candidate Email (Optional)</label>
              <input
                type="email"
                placeholder="candidate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Resume Document (.pdf or .txt, max 5MB)</label>
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Processing Resume...' : 'Upload & Register Candidate'}
          </button>
        </form>
      )}

      {/* Candidate List with Search & Filtering */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '17px', color: '#0f172a' }}>Candidate Roster</h3>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Showing {filteredRows.length} of {rows.length} candidates
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '220px', padding: '6px 12px', fontSize: '13px' }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '160px', padding: '6px 10px', fontSize: '13px' }}
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="consent_pending">Awaiting Consent</option>
              <option value="processing">Processing</option>
              <option value="consented">Consent Given</option>
              <option value="analyzed">Briefing Ready</option>
              <option value="failed">Failed</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b', fontSize: '14px' }}>
            No matching candidates found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredRows.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                  padding: '14px 18px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  transition: 'background 0.15s, border-color 0.15s'
                }}
              >
                <div>
                  <Link
                    to={'/candidates/' + c.id}
                    style={{ color: '#0f172a', fontWeight: 600, fontSize: '15px', textDecoration: 'none' }}
                  >
                    {c.full_name}
                  </Link>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                    {c.email || 'No email provided'} • {c.claim_count ? `${c.claim_count} claims scored` : 'Pending consent'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`badge status-${c.status}`}>
                    {getStatusLabel(c.status)}
                  </span>
                  <Link to={'/candidates/' + c.id} className="btn btn-secondary text-sm">
                    Open Briefing →
                  </Link>
                  {(role === 'admin' || role === 'recruiter' || !role) && (
                    <button
                      type="button"
                      className="btn btn-danger text-sm"
                      onClick={() => eraseCandidate(c.id, c.full_name)}
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                      title={`Permanently erase ${c.full_name}`}
                    >
                      Erase
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learning & Quality Dashboard */}
      <MetricsDashboard />

      {/* Role-Specific Operational Workflow Guidelines */}
      <RoleGuidelines />
    </div>
  );
}
