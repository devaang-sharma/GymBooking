import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive().max(2147483647),
});

export const checkinSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/, 'Code must be 6 letters or digits'),
});