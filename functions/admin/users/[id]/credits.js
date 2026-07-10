import { requireAdmin, AuthError } from '../../../_lib/auth.js';
import { json } from '../../../_lib/response.js';

export async function onRequestPost({ request, env, params }) {
  try {
    await requireAdmin(request, env);
    const { delta } = await request.json().catch(() => ({}));
    const d = Number(delta) || 0;
    await env.DB.prepare('UPDATE users SET credits = MAX(0, credits + ?) WHERE id = ?').bind(d, params.id).run();
    return json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}
