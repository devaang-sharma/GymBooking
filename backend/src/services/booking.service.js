import { query, withTransaction } from '../db.js';
import { AppError } from '../utils/AppError.js';
import { generateCheckinCode } from '../utils/checkinCode.js';



export async function bookSession(sessionId, userId) {
  return withTransaction(async (client) => {
    const s = await client.query(
      `SELECT id, capacity, start_time <= now() AS started
       FROM sessions WHERE id = $1 FOR UPDATE`,
      [sessionId]
    );
    const session = s.rows[0];
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Session not found');
    if (session.started) throw new AppError(409, 'SESSION_STARTED', 'This session has already started');

    //checking bookings
    const c = await client.query(
      `SELECT count(*)::int AS n FROM bookings
       WHERE session_id = $1 AND status = 'confirmed'`,
      [sessionId]
    );
    if (c.rows[0].n >= session.capacity) {
      throw new AppError(409, 'SESSION_FULL', 'This session is full');
    }

    //booking
    try {
      const r = await client.query(
        `INSERT INTO bookings (session_id, user_id, checkin_code)
         VALUES ($1, $2, $3)
         RETURNING id, session_id, status, checkin_code, created_at`,
        [sessionId, userId, generateCheckinCode()]
      );
      return r.rows[0];
    } catch (error) {
      if (error.code === '23505' && error.constraint === 'one_active_booking') {
        throw new AppError(409, 'ALREADY_BOOKED', 'you already have a booking for this session');
      }
      throw error;
    }
  });
}

async function promoteFromWaitlist(client, sessionId) {
  const w = await client.query(
    `SELECT id, user_id FROM waitlist
     WHERE session_id = $1
     ORDER BY created_at, id
     LIMIT 1
     FOR UPDATE`,
    [sessionId]
  );
  const next = w.rows[0];
  if (!next) return null;

  await client.query(
    `INSERT INTO bookings (session_id, user_id, checkin_code) VALUES ($1, $2, $3)`,
    [sessionId, next.user_id, generateCheckinCode()]
  );
  await client.query('DELETE FROM waitlist WHERE id = $1', [next.id]);
  return next.user_id;
}

export async function cancelBooking(bookingId, userId) {
  return withTransaction(async (client) => {
    //auth
    const b = await client.query(
      'SELECT id, user_id, session_id FROM bookings WHERE id = $1',
      [bookingId]
    );
    const booking = b.rows[0];
    if (!booking) throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    if (booking.user_id !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'This is not your booking');
    }

    // cancel after session started check
    const s = await client.query(
      'SELECT start_time <= now() AS started FROM sessions WHERE id = $1 FOR UPDATE',
      [booking.session_id]
    );
    if (s.rows[0].started) {
      throw new AppError(409, 'SESSION_STARTED', 'Cannot cancel after the session has started');
    }

    // cancel 
    const u = await client.query(
      `UPDATE bookings SET status = 'cancelled'
       WHERE id = $1 AND status = 'confirmed'
       RETURNING id`,
      [bookingId]
    );
    if (u.rowCount === 0) {
      throw new AppError(409, 'ALREADY_CANCELLED', 'This booking is already cancelled');
    }

    //take the next one in
    await promoteFromWaitlist(client, booking.session_id);

    return { id: bookingId, status: 'cancelled' };
  });
}


export async function listMyBookings(userId) {
  const result = await query(
    `SELECT b.id, b.status, b.checked_in_at, b.created_at,
            CASE WHEN b.status = 'confirmed' THEN b.checkin_code END AS checkin_code,
            s.id AS session_id, s.start_time
     FROM bookings b
     JOIN sessions s ON s.id = b.session_id
     WHERE b.user_id = $1
     ORDER BY s.start_time DESC, b.id DESC`,
    [userId]
  );
  return result.rows;
}

export async function listSessionBookings(sessionId) {
  const exists = await query('SELECT 1 FROM sessions WHERE id = $1', [sessionId]);
  if (exists.rowCount === 0) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Session not found');
  }

  const result = await query(
    `SELECT b.id, b.status, b.checked_in_at, b.created_at,
            u.id AS user_id, u.name, u.email
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     WHERE b.session_id = $1
     ORDER BY b.created_at, b.id`,
    [sessionId]
  );
  return result.rows;
}