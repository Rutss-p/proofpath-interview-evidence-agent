import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password, hash) {
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

export function makeJwt(user) {
  const expiresIn = `${config.jwtExpireMinutes}m`;
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role
    },
    config.jwtSecret,
    { expiresIn }
  );
}

export function decodeJwt(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function hashToken(token) {
  return crypto
    .createHmac('sha256', config.consentSecret)
    .update(token)
    .digest('hex');
}

export function newConsentToken() {
  const token = crypto.randomBytes(24).toString('base64url');
  return { token, hashed: hashToken(token) };
}
