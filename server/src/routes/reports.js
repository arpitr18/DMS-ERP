import { Router } from 'express';
import { getProfitReport, getSummaryReport } from '../controllers/reports.controller.js';

const router = Router();
router.get('/profit', getProfitReport);
router.get('/summary', getSummaryReport);
export default router;
