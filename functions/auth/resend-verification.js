import { requireAuth, AuthError } from '../_lib/auth.js';
import { json } from '../_lib/response.js';
import { sendEmail, verificationEmailHtml } from '../_lib/email.js';

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireAuth(request, env);
    if (user.email_verified) return json({ ok: true, alreadyVerified: true });

    let token = user.verification_token;
    if (!token) {
      token = crypto.randomUUID();
      await env.DB.prepare('UPDATE users SET verification_token = ? WHERE id = ?').bind(token, user.id).run();
    }

    const origin = new URL(request.url).origin;
    const verifyUrl = `${origin}/verify.html?token=${token}`;
    const result = await sendEmail({
      to: user.email,
      subject: 'Confirm your Share Your Music account',
      html: verificationEmailHtml(user.username, verifyUrl)
    }, env);

    if (result && result.ok === false) return json({ error: 'Could not send the email right now. Try again shortly.' }, 502);

    return json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}
