import { requireAdmin, AuthError } from '../../../_lib/auth.js';
import { json } from '../../../_lib/response.js';

export async function onRequestPost({ request, env, params }) {
  try {
    await requireAdmin(request, env);
    const row = await env.DB.prepare('SELECT is_featured FROM tracks WHERE id = ?').bind(params.id).first();
    if (!row) return json({ error: 'This track does not exist.' }, 404);
    const newVal = row.is_featured ? 0 : 1;
    await env.DB.prepare('UPDATE tracks SET is_featured = ? WHERE id = ?').bind(newVal, params.id).run();
    return json({ ok: true, is_featured: newVal });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}
