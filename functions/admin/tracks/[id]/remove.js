import { requireAdmin, AuthError } from '../../../_lib/auth.js';
import { json } from '../../../_lib/response.js';

export async function onRequestPost({ request, env, params }) {
  try {
    await requireAdmin(request, env);
    const row = await env.DB.prepare('SELECT id FROM tracks WHERE id = ?').bind(params.id).first();
    if (!row) return json({ error: 'This track does not exist.' }, 404);
    await env.DB.prepare('DELETE FROM tracks WHERE id = ?').bind(params.id).run();
    return json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}
