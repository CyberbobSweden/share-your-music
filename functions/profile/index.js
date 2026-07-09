import { requireAuth, AuthError } from '../_lib/auth.js';
import { json } from '../_lib/response.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireAuth(request, env);
    delete user.password_hash;
    return json({ user });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Serverfel.' }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const user = await requireAuth(request, env);
    const { bio, country, show_on_map } = await request.json().catch(() => ({}));
    await env.DB.prepare(
      'UPDATE users SET bio = ?, country = ?, show_on_map = ? WHERE id = ?'
    ).bind(bio || null, country || null, show_on_map ? 1 : 0, user.id).run();
    return json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Serverfel.' }, 500);
  }
}
