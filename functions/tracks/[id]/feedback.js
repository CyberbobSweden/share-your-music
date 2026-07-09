import { requireAuth, AuthError } from '../../_lib/auth.js';
import { json } from '../../_lib/response.js';

export async function onRequestGet({ request, env, params }) {
  try {
    const user = await requireAuth(request, env);
    const track = await env.DB.prepare('SELECT * FROM tracks WHERE id = ?').bind(params.id).first();
    if (!track) return json({ error: 'Låten finns inte.' }, 404);
    // Privacy-kärnan: bara ägaren (eller admin) får läsa feedbacken. Upprätthålls
    // här på servern, inte bara döljas i gränssnittet.
    if (track.owner_id !== user.id && !user.is_admin) {
      return json({ error: 'Bara låtägaren kan se feedback på den här låten.' }, 403);
    }

    const { results } = await env.DB.prepare(
      `SELECT f.*, u.username AS listener_name, u.ratings_pos, u.ratings_neg
       FROM feedback f JOIN users u ON u.id = f.listener_id
       WHERE f.track_id = ? ORDER BY f.created_at ASC`
    ).bind(params.id).all();

    return json({ feedback: results });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Serverfel.' }, 500);
  }
}

export async function onRequestPost({ request, env, params }) {
  try {
    const user = await requireAuth(request, env);
    const { text } = await request.json().catch(() => ({}));
    const trimmed = (text || '').trim();
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    if (trimmed.length < 100 || words < 15) {
      return json({ error: 'Feedback måste vara minst 100 tecken och 15 ord.' }, 400);
    }

    const track = await env.DB.prepare('SELECT * FROM tracks WHERE id = ?').bind(params.id).first();
    if (!track) return json({ error: 'Låten finns inte.' }, 404);
    if (track.owner_id === user.id) return json({ error: 'Du kan inte recensera din egen låt.' }, 400);
    if (track.feedback_count >= track.slots_target) {
      return json({ error: 'Låten har redan fått tillräckligt med feedback.' }, 400);
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM feedback WHERE track_id = ? AND listener_id = ?'
    ).bind(params.id, user.id).first();
    if (existing) return json({ error: 'Du har redan recenserat den här låten.' }, 400);

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
      return json({ error: 'Du har redan recenserat den här låten.' }, 400);
    }
    return json({ error: 'Serverfel.' }, 500);
  }
}
