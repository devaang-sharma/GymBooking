import { AppError } from '../utils/AppError.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new AppError(422, 'VALIDATION_ERROR', 'Invalid input', details);
    }

    if (source === 'body') req.body = result.data;
    else req.valid = { ...req.valid, [source]: result.data };
    next();
  };
}