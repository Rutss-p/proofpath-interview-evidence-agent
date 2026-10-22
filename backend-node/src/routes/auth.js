import express from 'express';
import { db } from '../db.js';
import { verifyPassword, makeJwt } from '../security.js';

export const authRouter = express.Router();

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password are required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const user = db.get('SELECT * FROM users WHERE email = ?', [cleanEmail]);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ detail: 'Wrong email or password' });
  }

  const token = makeJwt(user);
  return res.json({
    token,
    role: user.role,
    email: user.email
  });
});
