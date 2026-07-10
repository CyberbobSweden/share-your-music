import { requireAuth, AuthError } from '../../_lib/auth.js';
import { json } from '../../_lib/response.js';

export async function onRequestGet({ request, env, params }) {
  try {
    const user = await requireAuth(request, env);
    const track = await env.DB.prepare('SELECT * FROM tracks WHERE id = ?').bind(params.id).first();
    if (!track) return json({ error: 'This track does not exist.' }, 404);
    // The privacy core: only the owner (or an admin) may read the feedback. Enforced
    // here on the server, not just hidden in the UI.
    if (track.owner_id !== user.id && !user.is_admin) {
      return json({ error: 'Only the track owner can view feedback on this track.' }, 403);
    }

    const { results } = await env.DB.prepare(
      `SELECT f.*, u.username AS listener_name, u.ratings_pos, u.ratings_neg
       FROM feedback f JOIN users u ON u.id = f.listener_id
       WHERE f.track_id = ? ORDER BY f.created_at ASC`
    ).bind(params.id).all();

    return json({ feedback: results });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}

export async function onRequestPost({ request, env, params }) {
  try {
    const user = await requireAuth(request, env);
    const { text } = await request.json().catch(() => ({}));
    const trimmed = (text || '').trim();
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    if (trimmed.length < 100 || words < 15) {
      return json({ error: 'Feedback must be at least 100 characters and 15 words.' }, 400);
    }

    const track = await env.DB.prepare('SELECT * FROM tracks WHERE id = ?').bind(params.id).first();
    if (!track) return json({ error: 'This track does not exist.' }, 404);
    if (track.owner_id === user.id) return json({ error: 'You cannot review your own track.' }, 400);
    if (track.feedback_count >= track.slots_target) {
      return json({ error: 'This track has already received enough feedback.' }, 400);
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM feedback WHERE track_id = ? AND listener_id = ?'
    ).bind(params.id, user.id).first();
    if (existing) return json({ error: 'You have already reviewed this track.' }, 400);

    const ratio = (user.ratings_pos + 1) / (user.ratings_pos + user.ratings_neg + 2);
    const bonus = (user.ratings_pos + user.ratings_neg) >= 15 && ratio >= 0.75 ? 1 : 0;

    const fid = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO feedback (id, track_id, listener_id, text) VALUES (?, ?, ?, ?)'
      ).bind(fid, params.id, user.id, trimmed),
      env.DB.prepare('UPDATE tracks SET feedback_count = feedback_count + 1 WHERE id = ?').bind(params.id),
      env.DB.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').bind(1 + bonus, user.id)
    ]);

    return json({ ok: true, bonus });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    if (e.message && e.message.includes('UNIQUE')) {
      return json({ error: 'You have already reviewed this track.' }, 400);
    }
    return json({ error: 'Server error.' }, 500);
  }
}
