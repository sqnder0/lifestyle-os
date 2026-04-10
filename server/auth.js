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

async function verifySupabaseToken(token) {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  if (!payload?.id) return null;

  return {
    sub: payload.id,
    email: payload.email || null,
  };
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
    req.authProvider = 'legacy-jwt';
    return next();
  } catch {
    try {
      const supabasePayload = await verifySupabaseToken(token);
      if (!supabasePayload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      req.userId = supabasePayload.sub;
      req.authProvider = 'supabase';
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }
}
