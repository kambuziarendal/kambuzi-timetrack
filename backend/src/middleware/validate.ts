import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const parsed = schema.safeParse({ body: req.body, query: req.query, params: req.params });
  if (!parsed.success) return res.status(400).json({ message: 'Ugyldige data.', errors: parsed.error.flatten() });
  next();
};
