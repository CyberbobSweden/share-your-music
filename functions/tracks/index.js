import { requireAuth, AuthError } from '../_lib/auth.js';
import { json } from '../_lib/response.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireAuth(request, env);
    const url = new URL(request.url);
    const genres = (url.searchParams.get('genres') || '').split(',').map(g => g.trim()).filter(Boolean);
    if (genres.length === 0) return json({ tracks: [] });

    const placeholders = genres.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT t.* FROM tracks t
       WHERE t.owner_id != ?
         AND t.genre IN (${placeholders})
         AND t.feedback_count < t.slots_target
         AND t.id NOT IN (SELECT track_id FROM feedback WHERE listener_id = ?)
       ORDER BY t.is_featured DESC, t.feedback_count ASC
       LIMIT 40`
    ).bind(user.id, ...genres, user.id).all();

    // Small in-memory shuffle within each priority tier — admin-featured tracks
    // always stay on top, everything else is ordered by fewest reviews first
    // (so nothing waits forever) with a random tiebreak.
    const shuffled = results
      .map(t => ({ t, r: Math.random() }))
      .sort((a, b) => (b.t.is_featured - a.t.is_featured) || (a.t.feedback_count - b.t.feedback_count) || (a.r - b.r))
      .map(x => x.t);

    return json({ tracks: shuffled });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireAuth(request, env);
    const { title, url: trackUrl, embed_type, embed_id, genre, slots } = await request.json().catch(() => ({}));
    if (!title || !trackUrl || !embed_type || !embed_id || !genre || !slots) {
      return json({ error: 'All fields are required.' }, 400);
    }
    if (!Number.isInteger(Number(slots)) || Number(slots) < 1 || Number(slots) > 200) {
      return json({ error: 'Choose between 1 and 200 listens.' }, 400);
    }
    if (!['spotify', 'youtube'].includes(embed_type)) return json({ error: 'Invalid link type.' }, 400);
    if (user.credits < slots) return json({ error: 'Not enough credits.' }, 400);

    const id = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').bind(slots, user.id),
      env.DB.prepare(
        `INSERT INTO tracks (id, owner_id, title, url, embed_type, embed_id, genre, slots_target)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, user.id, title, trackUrl, embed_type, embed_id, genre, Number(slots))
    ]);

    return json({ id });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Server error.' }, 500);
  }
}
