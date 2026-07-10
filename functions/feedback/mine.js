import { requireAuth, AuthError } from '../_lib/auth.js';
import { json } from '../_lib/response.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireAuth(request, env);
    const { results } = await env.DB.prepare(
      `SELECT f.id, f.text, f.rated, f.rating_reason, f.created_at,
              t.title, t.genre, t.embed_type
       FROM feedback f JOIN tracks t ON t.id = f.track_id
       WHERE f.listener_id = ?
       ORDER BY f.created_at DESC`
    ).bind(user.id).all();
    return json({ feedback: results });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}
