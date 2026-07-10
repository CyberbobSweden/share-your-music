import { hashPassword } from '../_lib/password.js';
import { signJWT } from '../_lib/jwt.js';
import { json } from '../_lib/response.js';
import { sendEmail, verificationEmailHtml } from '../_lib/email.js';

// Turned off until a verified sending domain is set up in Resend — see README
// "Om mejl inte skickas". Flip this back to true (and re-add the banner call
// in app.html's init()) once EMAIL_FROM points at a real domain.
const EMAIL_VERIFICATION_ENABLED = false;

export async function onRequestPost({ request, env }) {
  try {
    const { username, email, password } = await request.json().catch(() => ({}));
    if (!username || !email || !password) return json({ error: 'Fill in all fields.' }, 400);
    if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(normalizedEmail).first();
    if (existing) return json({ error: 'That email address is already in use.' }, 400);

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const verificationToken = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO users (id, username, email, password_hash, verification_token) VALUES (?, ?, ?, ?, ?)`
    ).bind(id, username.trim(), normalizedEmail, passwordHash, verificationToken).run();

    const token = await signJWT({ sub: id }, env.JWT_SECRET);
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
    delete user.password_hash;
    delete user.verification_token;

    if (EMAIL_VERIFICATION_ENABLED) {
      // Best-effort: registration succeeds even if the email fails to send.
      try {
        const origin = new URL(request.url).origin;
        const verifyUrl = `${origin}/verify.html?token=${verificationToken}`;
        await sendEmail({
          to: normalizedEmail,
          subject: 'Confirm your Share Your Music account',
          html: verificationEmailHtml(username.trim(), verifyUrl)
        }, env);
      } catch (mailErr) {
        console.error('Failed to send verification email', mailErr);
      }
    }

    return json({ token, user });
  } catch (e) {
    return json({ error: 'Server error during registration.' }, 500);
  }
}
