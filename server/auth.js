import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN_TTL = '7d';
const STATE_TTL = '10m';

function requireSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required to run the API server.');
  }
}

export function signToken(userId) {
  requireSecret();
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token) {
  requireSecret();
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function signAuthState(payload) {
  requireSecret();
  return jwt.sign({ ...payload, type: 'oauth_state' }, process.env.JWT_SECRET, { expiresIn: STATE_TTL });
}

export function verifyAuthState(token) {
  requireSecret();
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload?.type !== 'oauth_state') {
    throw new Error('Invalid OAuth state token');
  }
  return payload;
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
