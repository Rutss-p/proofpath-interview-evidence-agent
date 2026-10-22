import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { getToken, setToken, getUserRole, setUserRole } from './api';
import Login from './pages/Login';
import Candidates from './pages/Candidates';
import CandidateDetail from './pages/CandidateDetail';
import Consent from './pages/Consent';

function Protected({ children }) {
  const token = getToken();
  return token ? children : <Navigate to="/login" replace />;
}

function Nav() {
  const nav = useNavigate();
  const location = useLocation();
  const token = getToken();
  const role = getUserRole();

  if (!token || location.pathname.startsWith('/consent/')) return null;

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <div className="brand-icon">P</div>
        <div>
          <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a' }}>
            ProofPath
          </span>
          <span style={{ fontSize: '11px', display: 'block', color: '#64748b', lineHeight: 1 }}>
            Execution-Verified Technical Hiring
          </span>
        </div>
      </Link>

      <div className="nav-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
          Candidates
        </Link>
        {role && (
          <span className="user-badge">
            Staff: <strong style={{ color: '#4f46e5', textTransform: 'capitalize' }}>{role}</strong>
          </span>
        )}
        <button
          className="btn btn-secondary text-sm"
          onClick={() => {
            setToken(null);
            setUserRole(null);
            nav('/login');
          }}
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div className="app-container">
      <Nav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/consent/:token" element={<Consent />} />
        <Route
          path="/"
          element={
            <Protected>
              <Candidates />
            </Protected>
          }
        />
        <Route
          path="/candidates/:id"
          element={
            <Protected>
              <CandidateDetail />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
