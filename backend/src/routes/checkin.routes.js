import express from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { checkinSchema } from '../schemas/booking.schema.js';
import * as checkinService from '../services/checkin.service.js';

const checkinRoutes = express.Router();

checkinRoutes.post('/', auth, requireRole('admin'), validate(checkinSchema), async (req, res) => {
  res.json(await checkinService.checkIn(req.body.code));
});

export default checkinRoutes;