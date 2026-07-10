import { requireAdmin, AuthError } from '../../_lib/auth.js';
import { json } from '../../_lib/response.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(request, env);
    const { results } = await env.DB.prepare(
      `SELECT t.id, t.title, t.genre, t.embed_type, t.slots_target, t.feedback_count,
              t.is_featured, t.created_at, u.username AS owner_name
       FROM tracks t JOIN users u ON u.id = t.owner_id
       ORDER BY t.is_featured DESC, t.created_at DESC
       LIMIT 200`
    ).all();
    return json({ tracks: results });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}
