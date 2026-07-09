import { requireAuth, AuthError } from '../_lib/auth.js';
import { json } from '../_lib/response.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAuth(request, env); // måste vara inloggad för att se community, men allt innehåll här är redan publikt tänkt
    const { results } = await env.DB.prepare(
      `SELECT id, username, bio, ratings_pos, ratings_neg, created_at,
              CASE WHEN show_on_map = 1 THEN country ELSE NULL END AS country
       FROM users
       WHERE is_banned = 0
       ORDER BY created_at DESC
       LIMIT 200`
    ).all();
    return json({ members: results });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Serverfel.' }, 500);
  }
}
