import { requireAuth, AuthError } from '../_lib/auth.js';
import { json } from '../_lib/response.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireAuth(request, env);
    const { results } = await env.DB.prepare(
      'SELECT * FROM tracks WHERE owner_id = ? ORDER BY created_at DESC'
    ).bind(user.id).all();
    return json({ tracks: results });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Serverfel.' }, 500);
  }
}
