import bcrypt from 'bcrypt';
import query  from '../db.js';
import { AppError } from '../utils/AppError.js';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';


async function registerUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'member')
       RETURNING id, name, email, role`,
      [name, email, passwordHash]
    );

    return result.rows[0];
  } catch (error) {
   
    //unique
    if (error.code === '23505') {
      throw new AppError(409, 'EMAIL_TAKEN', 'Email is already registered');
    }

    throw error;
  }
}

export async function loginUser({ email, password }) {
  const result = await query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];

  
  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const token = jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: '8h',
  });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}


module.exports = { registerUser, loginUser };