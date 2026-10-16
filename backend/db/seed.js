import bcrypt from 'bcrypt';
import { pool } from '../src/db.js';

const PASSWORD = 'Password123!';

const accounts = [
  ['Admin One', 'admin1@gym.test', 'admin'],
  ['Admin Two', 'admin2@gym.test', 'admin'],
  ['Member One', 'member1@gym.test', 'member'],
  ['Member Two', 'member2@gym.test', 'member'],
  ['Member Three', 'member3@gym.test', 'member'],
];

try {
  const hash = await bcrypt.hash(PASSWORD, 10);

  await pool.query('TRUNCATE waitlist, bookings, sessions, users RESTART IDENTITY CASCADE');

  for (const [name, email, role] of accounts) {
    await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [name, email, hash, role]
    );
  }

  console.log('Clean database. 2 admins, 3 members, no sessions.');
  console.log('Password for every account:', PASSWORD);
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}