import { query, withTransaction } from '../db.js';
import { AppError } from '../utils/AppError.js';

export async function joinWaitlist(sessionId, userId) {
  return withTransaction(async (client) => {
    // locking
    const s = await client.query(
      `SELECT id, capacity, start_time <= now() AS started
       FROM sessions WHERE id = $1 FOR UPDATE`,
      [sessionId]
    );
    const session = s.rows[0];
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Session not found');
    if (session.started) throw new AppError(409, 'SESSION_STARTED', 'This session has already started');

    const c = await client.query(
      `SELECT count(*)::int AS n,
              count(*) FILTER (WHERE user_id = $2)::int AS mine
       FROM bookings WHERE session_id = $1 AND status = 'confirmed'`,
      [sessionId, userId]
    );
    if (c.rows[0].mine > 0) {
      throw new AppError(409, 'ALREADY_BOOKED', 'You already have a booking for this session');
    }
    if (c.rows[0].n < session.capacity) {
      throw new AppError(409, 'SESSION_NOT_FULL', 'This session has free seats, book it instead');
    }

    try {
      const r = await client.query(
        `INSERT INTO waitlist (session_id, user_id) VALUES ($1, $2)
         RETURNING id, session_id, created_at`,
        [sessionId, userId]
      );
      return r.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new AppError(409, 'ALREADY_WAITLISTED', 'You are already on this waitlist');
      }
      throw error;
    }
  });
}

export async function leaveWaitlist(sessionId, userId) {
  const r = await query(
    'DELETE FROM waitlist WHERE session_id = $1 AND user_id = $2',
    [sessionId, userId]
  );
  if (r.rowCount === 0) {
    throw new AppError(404, 'NOT_ON_WAITLIST', 'You are not on this waitlist');
  }
}