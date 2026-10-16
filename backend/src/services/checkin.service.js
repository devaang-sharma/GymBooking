import { query } from '../db.js';
import { AppError } from '../utils/AppError.js';

export async function checkIn(code) {
  // one atomic statement: every rule is in the WHERE clause
  const done = await query(
    `WITH done AS (
       UPDATE bookings b SET checked_in_at = now()
       FROM sessions s
       WHERE b.session_id = s.id
         AND b.checkin_code = $1
         AND b.status = 'confirmed'
         AND b.checked_in_at IS NULL
         AND now() >= s.start_time
         AND now() < s.start_time + interval '1 hour'
       RETURNING b.id, b.user_id, b.session_id, b.checked_in_at
     )
     SELECT d.id AS booking_id, d.session_id, d.checked_in_at, u.name, u.email
     FROM done d JOIN users u ON u.id = d.user_id`,
    [code]
  );
  if (done.rowCount === 1) return done.rows[0];

  // nothing updated: find out why, so the admin gets a useful answer
  const r = await query(
    `SELECT b.status, b.checked_in_at, s.start_time
     FROM bookings b JOIN sessions s ON s.id = b.session_id
     WHERE b.checkin_code = $1`,
    [code]
  );
  const b = r.rows[0];
  if (!b) throw new AppError(404, 'INVALID_CODE', 'No booking has this code');
  if (b.status === 'cancelled') throw new AppError(409, 'BOOKING_CANCELLED', 'This booking was cancelled');
  if (b.checked_in_at) throw new AppError(409, 'CODE_ALREADY_USED', 'This code was already used');
  throw new AppError(409, 'OUTSIDE_SESSION_HOUR', 'Check-in is only open during the session hour');
}