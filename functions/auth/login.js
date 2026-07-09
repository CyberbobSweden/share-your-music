import { verifyPassword } from '../_lib/password.js';
import { signJWT } from '../_lib/jwt.js';
import { json } from '../_lib/response.js';

export async function onRequestPost({ request, env }) {
  try {
    const { email, password } = await request.json().catch(() => ({}));
    if (!email || !password) return json({ error: 'Ange e-post och lösenord.' }, 400);

    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.trim().toLowerCase()).first();
    if (!user) return json({ error: 'Fel e-post eller lösenord.' }, 401);
    if (user.is_banned) return json({ error: 'Det här kontot är avstängt av en admin.' }, 403);

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return json({ error: 'Fel e-post eller lösenord.' }, 401);

    const token = await signJWT({ sub: user.id }, env.JWT_SECRET);
    delete user.password_hash;

    return json({ token, user });
  } catch (e) {
    return json({ error: 'Serverfel vid inloggning.' }, 500);
  }
}
