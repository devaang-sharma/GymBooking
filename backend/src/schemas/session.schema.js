import { z } from 'zod';

const isRealDate = (v) => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine(isRealDate, 'Not a real calendar date');

export const createSessionSchema = z.object({
  date: dateString,
  hour: z.number().int('Hour must be a whole number').min(0).max(23),
});

export const listQuerySchema = z.object({
  date: dateString.optional(),
});