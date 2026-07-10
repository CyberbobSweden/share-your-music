import { requireAuth, AuthError } from '../_lib/auth.js';
import { json } from '../_lib/response.js';

export async function onRequestPut({ request, env }) {
  try {
    const user = await requireAuth(request, env);
    const { genres } = await request.json().catch(() => ({}));
    await env.DB.prepare('UPDATE users SET preferred_genres = ? WHERE id = ?')
      .bind(JSON.stringify(Array.isArray(genres) ? genres : []), user.id).run();
    return json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}
