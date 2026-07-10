import { verifyPassword } from '../_lib/password.js';
import { signJWT } from '../_lib/jwt.js';
import { json } from '../_lib/response.js';

export async function onRequestPost({ request, env }) {
  try {
    const { email, password } = await request.json().catch(() => ({}));
    if (!email || !password) return json({ error: 'Enter your email and password.' }, 400);

    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.trim().toLowerCase()).first();
    if (!user) return json({ error: 'Wrong email or password.' }, 401);
    if (user.is_banned) return json({ error: 'This account has been banned by an admin.' }, 403);

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return json({ error: 'Wrong email or password.' }, 401);

    const token = await signJWT({ sub: user.id }, env.JWT_SECRET);
    delete user.password_hash;
    delete user.verification_token;

    return json({ token, user });
  } catch (e) {
    return json({ error: 'Server error during sign-in.' }, 500);
  }
}
