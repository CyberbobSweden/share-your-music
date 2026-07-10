import { requireAdmin, AuthError } from '../../_lib/auth.js';
import { json } from '../../_lib/response.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(request, env);
    const { results } = await env.DB.prepare(
      `SELECT s.id, s.text, s.status, s.created_at, u.username, u.email
       FROM suggestions s JOIN users u ON u.id = s.user_id
       ORDER BY (s.status = 'open') DESC, s.created_at DESC`
    ).all();
    return json({ suggestions: results });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}
