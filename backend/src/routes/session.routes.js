import express from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { createSessionSchema, listQuerySchema } from '../schemas/session.schema.js';
import * as sessionService from '../services/session.service.js';

const sessionRoutes = express.Router();

sessionRoutes.post(
  '/',
  auth,
  requireRole('admin'),
  validate(createSessionSchema),
  async (req, res) => {
    const session = await sessionService.createSession(req.body, req.user.id);
    res.status(201).json(session);
  }
);

sessionRoutes.get('/', auth, validate(listQuerySchema, 'query'), async (req, res) => {
  const sessions = await sessionService.listSessions({
    isAdmin: req.user.role === 'admin',
    date: req.valid?.query?.date,
  });
  res.json(sessions);
});

export default sessionRoutes;