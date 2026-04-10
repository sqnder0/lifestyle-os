import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN_TTL = '7d';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabaseAuthClient = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;

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
  if (!supabaseAuthClient) return null;

  const { data, error } = await supabaseAuthClient.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
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
    const supabaseUserId = await verifySupabaseToken(token);
    if (supabaseUserId) {
      req.userId = supabaseUserId;
      return next();
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
