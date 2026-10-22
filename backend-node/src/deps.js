import { decodeJwt } from './security.js';
import { db } from './db.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Authentication credentials were not provided' });
  }

  const token = authHeader.slice(7).trim();
  try {
    const payload = decodeJwt(token);
    const user = db.get('SELECT id, email, role FROM users WHERE id = ?', [payload.sub]);
    if (!user) {
      return res.status(401).json({ detail: 'User not found' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired authentication token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    authenticate(req, res, () => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ detail: 'Permission denied: insufficient privileges' });
      }
      next();
    });
  };
}
