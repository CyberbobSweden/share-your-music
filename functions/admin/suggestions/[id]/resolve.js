import { requireAdmin, AuthError } from '../../../_lib/auth.js';
import { json } from '../../../_lib/response.js';

export async function onRequestPost({ request, env, params }) {
  try {
    await requireAdmin(request, env);
    const row = await env.DB.prepare('SELECT status FROM suggestions WHERE id = ?').bind(params.id).first();
    if (!row) return json({ error: 'This suggestion does not exist.' }, 404);
    const newStatus = row.status === 'open' ? 'reviewed' : 'open';
    await env.DB.prepare('UPDATE suggestions SET status = ? WHERE id = ?').bind(newStatus, params.id).run();
    return json({ ok: true, status: newStatus });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}
