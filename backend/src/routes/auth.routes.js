import express from 'express';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import * as authService from '../services/auth.service.js'
import { auth } from '../middleware/auth.js'
import { requireRole } from '../middleware/requireRole.js';

const authRoutes = express.Router();

authRoutes.post('/register', validate(registerSchema), async (req, res) => {
  const user = await authService.registerUser(req.body);
  res.status(201).json(user);
});

authRoutes.post('/login', validate(loginSchema), async (req, res) => {
  const result = await authService.loginUser(req.body);
  res.status(200).json(result);
});

//temp checks
authRoutes.get('/me', auth, (req, res) => {
  res.json(req.user);
});

authRoutes.get('/admin-check', auth, requireRole('admin'), (req, res) => {
  res.json({ ok: true });
});

export default authRoutes;