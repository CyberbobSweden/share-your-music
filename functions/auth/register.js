import { hashPassword } from '../_lib/password.js';
import { signJWT } from '../_lib/jwt.js';
import { json } from '../_lib/response.js';

export async function onRequestPost({ request, env }) {
  try {
    const { username, email, password } = await request.json().catch(() => ({}));
    if (!username || !email || !password) return json({ error: 'Fyll i alla fält.' }, 400);
    if (password.length < 8) return json({ error: 'Lösenordet måste vara minst 8 tecken.' }, 400);

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(normalizedEmail).first();
    if (existing) return json({ error: 'E-postadressen används redan.' }, 400);

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await env.DB.prepare(
      `INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)`
    ).bind(id, username.trim(), normalizedEmail, passwordHash).run();

    const token = await signJWT({ sub: id }, env.JWT_SECRET);
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
    delete user.password_hash;

    return json({ token, user });
  } catch (e) {
    return json({ error: 'Serverfel vid registrering.' }, 500);
  }
}
