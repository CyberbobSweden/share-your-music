import { requireAdmin, AuthError } from '../../../_lib/auth.js';
import { json } from '../../../_lib/response.js';

export async function onRequestPost({ request, env, params }) {
  try {
    await requireAdmin(request, env);
    const target = await env.DB.prepare('SELECT is_admin, is_banned FROM users WHERE id = ?').bind(params.id).first();
    if (!target) return json({ error: 'Användaren finns inte.' }, 404);
    if (target.is_admin) return json({ error: 'Kan inte spärra en admin.' }, 400);
    await env.DB.prepare('UPDATE users SET is_banned = ? WHERE id = ?').bind(target.is_banned ? 0 : 1, params.id).run();
    return json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Serverfel.' }, 500);
  }
}
