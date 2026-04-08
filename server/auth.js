import jwt from 'jsonwebtoken';

const TOKEN_TTL = '7d';

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

export function authMiddleware(req, res, next) {
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
