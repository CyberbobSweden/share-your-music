// Sends transactional email via Resend's HTTP API. No SDK needed — just fetch.
// Requires RESEND_API_KEY (and optionally EMAIL_FROM) as environment variables.
// If RESEND_API_KEY isn't set, this silently no-ops so local dev / early setup
// doesn't crash registration — it just skips sending.

export async function sendEmail({ to, subject, html }, env) {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email send.');
    return { skipped: true };
  }
  const from = env.EMAIL_FROM || 'Share Your Music <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject, html })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('Resend API error', res.status, errText);
    return { ok: false, status: res.status };
  }
  return { ok: true };
}

export function verificationEmailHtml(username, verifyUrl) {
  return `
    <div style="font-family:sans-serif;background:#14120f;color:#f2ede4;padding:32px;">
      <h1 style="color:#ff4b3e;">Share Your Music</h1>
      <p>Hi ${username},</p>
      <p>Thanks for signing up. Confirm your email address to finish setting up your account:</p>
      <p style="margin:24px 0;">
        <a href="${verifyUrl}" style="background:#ff4b3e;color:#1a0a08;padding:12px 20px;text-decoration:none;border-radius:4px;font-weight:bold;">Verify email</a>
      </p>
      <p style="color:#948b7d;font-size:13px;">If the button doesn't work, copy this link into your browser:<br>${verifyUrl}</p>
    </div>
  `;
}
