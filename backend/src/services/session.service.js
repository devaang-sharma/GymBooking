import { query } from '../db.js';
import { AppError } from '../utils/AppError.js';

const GYM_TZ = 'Asia/Kolkata';
const GYM_OFFSET = '+05:30';

export async function createSession({ date, hour }, userId) {
  const start = `${date}T${String(hour).padStart(2, '0')}:00:00${GYM_OFFSET}`;

  if (new Date(start) <= new Date()) {
    throw new AppError(422, 'SESSION_IN_PAST', 'Session must start in the future');
  }

  try {
    const result = await query(
      `INSERT INTO sessions (start_time, created_by)
       VALUES ($1, $2)
       RETURNING id, start_time, capacity, created_by`,
      [start, userId]
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError(409, 'SESSION_EXISTS', 'A session already starts at that time');
    }
    throw error;
  }
}

export async function listSessions({ isAdmin, date }) {
  const result = await query(
    `SELECT s.id, s.start_time, s.capacity, s.created_by,
            (s.capacity - COUNT(b.id) FILTER (WHERE b.status = 'confirmed'))::int AS seats_left
     FROM sessions s
     LEFT JOIN bookings b ON b.session_id = s.id
     WHERE ($1::boolean OR s.start_time > now())
       AND ($2::date IS NULL OR (s.start_time AT TIME ZONE '${GYM_TZ}')::date = $2::date)
     GROUP BY s.id
     ORDER BY s.start_time ASC`,
    [isAdmin, date ?? null]
  );
  return result.rows;
}