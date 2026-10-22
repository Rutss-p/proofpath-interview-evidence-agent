import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, setUserRole } from '../api';

export default function Login() {
  const [activeRole, setActiveRole] = useState('recruiter');
  const [email, setEmail] = useState('recruiter@demo.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  function selectRole(role) {
    setActiveRole(role);
    if (role === 'recruiter') {
      setEmail('recruiter@demo.com');
      setPassword('ChangeMe123!');
    } else {
      setEmail('interviewer@demo.com');
      setPassword('ChangeMe123!');
    }
    setError('');
  }

  async function submit(e) {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password }
      });
      setToken(data.token);
      setUserRole(data.role);
      nav('/');
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please verify your credentials.');
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: '440px', margin: '48px auto' }}>
      <form onSubmit={submit} className="card">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            className="brand-icon"
            style={{ width: '48px', height: '48px', fontSize: '24px', margin: '0 auto 12px' }}
          >
            P
          </div>
          <h2 style={{ fontSize: '22px', color: '#0f172a' }}>Sign in to ProofPath</h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Staff portal for recruiters and technical interviewers
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Role Quick-Select Bar */}
        <div style={{ marginBottom: '18px' }}>
          <label
            className="form-label"
            style={{ marginBottom: '8px', display: 'block', fontSize: '12px', textAlign: 'center', color: '#475569' }}
          >
            Select Role to Auto-Fill Demo Credentials:
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '8px'
            }}
          >
            <button
              type="button"
              onClick={() => selectRole('recruiter')}
              style={{
                padding: '9px 12px',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeRole === 'recruiter' ? '#ffffff' : 'transparent',
                color: activeRole === 'recruiter' ? '#4f46e5' : '#64748b',
                boxShadow: activeRole === 'recruiter' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>💼</span>
              <span>Recruiter</span>
            </button>
            <button
              type="button"
              onClick={() => selectRole('interviewer')}
              style={{
                padding: '9px 12px',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeRole === 'interviewer' ? '#ffffff' : 'transparent',
                color: activeRole === 'interviewer' ? '#4f46e5' : '#64748b',
                boxShadow: activeRole === 'interviewer' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>🔍</span>
              <span>Interviewer</span>
            </button>
          </div>
          <div
            style={{
              fontSize: '11.5px',
              color: '#64748b',
              textAlign: 'center',
              marginTop: '6px',
              background: '#fafafa',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
          >
            {activeRole === 'recruiter' ? (
              <span>💼 <strong>Recruiter:</strong> Candidate registration, consent links & erasure</span>
            ) : (
              <span>🔍 <strong>Interviewer:</strong> Claims inspection, 3-tier questions & code conversion</span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            placeholder="e.g. recruiter@demo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setActiveRole('');
            }}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '10px', padding: '10px 16px', fontSize: '14.5px' }}
          disabled={loading}
        >
          {loading ? 'Signing in...' : `Sign In as ${activeRole === 'interviewer' ? 'Interviewer' : 'Recruiter'}`}
        </button>

        <div
          style={{
            marginTop: '20px',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '14px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#64748b'
          }}
        >
          Pre-filled with default seeded demo password (<code>ChangeMe123!</code>).
        </div>
      </form>
    </div>
  );
}
