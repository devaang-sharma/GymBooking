import express from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { createSessionSchema, listQuerySchema } from '../schemas/session.schema.js';
import { idParamSchema } from '../schemas/booking.schema.js';
import * as sessionService from '../services/session.service.js';
import * as bookingService from '../services/booking.service.js';
import * as waitlistService from '../services/waitlist.service.js'

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
    userId: req.user.id,
  });
  res.json(sessions);
});

sessionRoutes.post('/:id/book', auth, validate(idParamSchema, 'params'), async (req, res) => {
  const booking = await bookingService.bookSession(req.valid.params.id, req.user.id);
  res.status(201).json(booking);
});

sessionRoutes.get(
  '/:id/bookings',
  auth,
  requireRole('admin'),
  validate(idParamSchema, 'params'),
  async (req, res) => {
    res.json(await bookingService.listSessionBookings(req.valid.params.id));
  }
);

sessionRoutes.post('/:id/waitlist', auth, validate(idParamSchema, 'params'), async (req, res) => {
  const entry = await waitlistService.joinWaitlist(req.valid.params.id, req.user.id);
  res.status(201).json(entry);
});

sessionRoutes.delete('/:id/waitlist', auth, validate(idParamSchema, 'params'), async (req, res) => {
  await waitlistService.leaveWaitlist(req.valid.params.id, req.user.id);
  res.status(204).end();
});

export default sessionRoutes;