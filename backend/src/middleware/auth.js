import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from '../utils/AppError.js';

export function auth(req, res, next) {
    const header = req.headers.authorization

    if (!header || !header.startsWith('Bearer ')) {
        throw new AppError(401, 'UNAUTHENTICATED', 'Login required');
    }

     const token = header.slice(7);

    try {
        const payload = jwt.verify(token, config.jwtSecret);
        req.user = { id: payload.id, role: payload.role };
    } catch {
        throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired token');
    }

  next();
}
