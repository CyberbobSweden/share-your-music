import { verifyJWT } from './jwt.js';

export class AuthError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function getAuthUser(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return null;
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.sub).first();
  if (!user || user.is_banned) return null;
  return user;
}

export async function requireAuth(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) throw new AuthError('Not signed in.', 401);
  return user;
}

export async function requireAdmin(request, env) {
  const user = await requireAuth(request, env);
  if (!user.is_admin) throw new AuthError('Requires admin privileges.', 403);
  return user;
}
