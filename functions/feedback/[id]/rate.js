import { requireAuth, AuthError } from '../../_lib/auth.js';
import { json } from '../../_lib/response.js';

export async function onRequestPost({ request, env, params }) {
  try {
    const user = await requireAuth(request, env);
    const { helpful, reason } = await request.json().catch(() => ({}));

    const row = await env.DB.prepare(
      `SELECT f.*, t.owner_id AS track_owner
       FROM feedback f JOIN tracks t ON t.id = f.track_id
       WHERE f.id = ?`
    ).bind(params.id).first();
    if (!row) return json({ error: 'This review does not exist.' }, 404);
    if (row.track_owner !== user.id) return json({ error: 'Only the track owner can rate feedback.' }, 403);
    if (row.rated !== null) return json({ error: 'Already rated.' }, 400);

    if (!helpful && (!reason || reason.trim().length < 10)) {
      return json({ error: 'A negative rating requires a reason of at least 10 characters.' }, 400);
    }

    await env.DB.batch([
      env.DB.prepare('UPDATE feedback SET rated = ?, rating_reason = ? WHERE id = ?')
        .bind(helpful ? 1 : 0, helpful ? null : reason.trim(), params.id),
      env.DB.prepare(
        helpful
          ? 'UPDATE users SET ratings_pos = ratings_pos + 1 WHERE id = ?'
          : 'UPDATE users SET ratings_neg = ratings_neg + 1 WHERE id = ?'
      ).bind(row.listener_id)
    ]);

    return json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}
