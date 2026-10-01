import type { Request, Response, NextFunction } from 'express';

export type AuthedRequest = Request & {
  userId?: string;
  accessToken?: string;
};

/**
 * Require a valid Supabase Bearer JWT. Attaches `req.userId` and `req.accessToken`.
 * Generalized from the admin feedback gate — any authenticated user may pass.
 */
export async function requireUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const anon = String(process.env.SUPABASE_ANON_KEY || '').trim();

  if (!token) {
    res.status(401).json({ error: 'Sign in required.' });
    return;
  }
  if (!supabaseUrl || !anon) {
    res.status(503).json({ error: 'Auth API not configured (SUPABASE_URL / SUPABASE_ANON_KEY).' });
    return;
  }

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!userRes.ok) {
      res.status(401).json({ error: 'Invalid or expired session.' });
      return;
    }
    const user = (await userRes.json()) as { id?: string };
    if (!user?.id) {
      res.status(401).json({ error: 'Invalid or expired session.' });
      return;
    }
    req.userId = user.id;
    req.accessToken = token;
    next();
  } catch {
    res.status(401).json({ error: 'Could not verify session.' });
  }
}
