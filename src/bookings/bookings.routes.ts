import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole, AuthedRequest } from '../auth/auth.middleware';
import { importBookingsCsv, HttpError } from './bookings.service';

export const bookingsRouter = Router();

// Memory storage: file never touches disk, fine for the sizes this exercise targets
// (1,000 rows / a few MB). A 500MB streaming import (S6) would need a different approach.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB cap — generous for a CSV of bookings
});

bookingsRouter.use(requireAuth, requireRole('COMPANY_ADMIN', 'FINANCE'));

bookingsRouter.post('/import', upload.single('file'), async (req: AuthedRequest, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'No file uploaded. Expected field name "file".' },
    });
  }

  try {
    const result = await importBookingsCsv(req.user!.companyId, req.file.buffer);
    return res.status(200).json({ data: result });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});