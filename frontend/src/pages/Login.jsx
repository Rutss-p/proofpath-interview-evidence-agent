import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, setUserRole } from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

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

  function fillDemo(userEmail) {
    setEmail(userEmail);
    setPassword('ChangeMe123!');
  }

  return (
    <div style={{ maxWidth: '420px', margin: '48px auto' }}>
      <form onSubmit={submit} className="card">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="brand-icon" style={{ width: '48px', height: '48px', fontSize: '24px', margin: '0 auto 12px' }}>
            P
          </div>
          <h2 style={{ fontSize: '22px', color: '#0f172a' }}>Sign in to ProofPath</h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Staff portal for recruiters and interviewers
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            placeholder="e.g. recruiter@demo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', textAlign: 'center' }}>
            Quick Demo Login (Pre-filled test accounts):
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary text-sm"
              style={{ flex: 1 }}
              onClick={() => fillDemo('recruiter@demo.com')}
            >
              Recruiter
            </button>
            <button
              type="button"
              className="btn btn-secondary text-sm"
              style={{ flex: 1 }}
              onClick={() => fillDemo('interviewer@demo.com')}
            >
              Interviewer
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
