import { requireAuth, AuthError } from '../_lib/auth.js';
import { json } from '../_lib/response.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireAuth(request, env);
    const { results } = await env.DB.prepare(
      'SELECT id, text, status, created_at FROM suggestions WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.id).all();
    return json({ suggestions: results });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireAuth(request, env);
    const { text } = await request.json().catch(() => ({}));
    const trimmed = (text || '').trim();
    if (trimmed.length < 10) return json({ error: 'Tell us a bit more — at least 10 characters.' }, 400);
    if (trimmed.length > 2000) return json({ error: 'Keep it under 2000 characters.' }, 400);

    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO suggestions (id, user_id, text) VALUES (?, ?, ?)'
    ).bind(id, user.id, trimmed).run();

    return json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}
