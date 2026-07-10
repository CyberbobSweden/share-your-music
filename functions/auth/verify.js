import { json } from '../_lib/response.js';

export async function onRequestPost({ request, env }) {
  try {
    const { token } = await request.json().catch(() => ({}));
    if (!token) return json({ error: 'Missing verification token.' }, 400);

    const user = await env.DB.prepare('SELECT id, email_verified FROM users WHERE verification_token = ?').bind(token).first();
    if (!user) return json({ error: 'This verification link is invalid or has already been used.' }, 400);
    if (user.email_verified) return json({ ok: true, alreadyVerified: true });

    await env.DB.prepare(
      'UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?'
    ).bind(user.id).run();

    return json({ ok: true });
  } catch (e) {
    return json({ error: 'Server error.' }, 500);
  }
}
