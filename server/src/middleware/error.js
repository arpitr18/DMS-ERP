import multer from 'multer';
import { ZodError } from 'zod';

export function notFound(req, res) {
  res.status(404).json({ message: 'Route not found.' });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Validation failed.', errors: err.issues });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  if (err?.code === 'P2002') {
    return res.status(409).json({ message: 'A record with the same unique value already exists.' });
  }
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong.' });
}
