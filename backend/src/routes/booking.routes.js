import express from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../schemas/booking.schema.js';
import * as bookingService from '../services/booking.service.js';

const bookingRoutes = express.Router();

bookingRoutes.post('/:id/cancel', auth, validate(idParamSchema, 'params'), async (req, res) => {
  const result = await bookingService.cancelBooking(req.valid.params.id, req.user.id);
  res.json(result);
});

bookingRoutes.get('/mine', auth, async (req, res) => {
  res.json(await bookingService.listMyBookings(req.user.id));
});

export default bookingRoutes;