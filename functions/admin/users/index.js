import { requireAdmin, AuthError } from '../../_lib/auth.js';
import { json } from '../../_lib/response.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(request, env);
    const { results } = await env.DB.prepare(
      `SELECT id, username, email, credits, ratings_pos, ratings_neg, is_admin, is_banned, created_at
       FROM users ORDER BY username`
    ).all();
    return json({ users: results });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}
