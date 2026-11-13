import { Router } from 'express';
import multer from 'multer';
import { createRetailer, getRetailerLedger, importRetailers, listRetailers, updateRetailer } from '../controllers/retailers.controller.js';

import { downloadTemplate } from '../controllers/templates.controller.js';
const router = Router();
router.get('/template', downloadTemplate('retailers'));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.get('/', listRetailers);
router.post('/', createRetailer);
router.put('/:id', updateRetailer);
router.get('/:id/ledger', getRetailerLedger);
router.post('/import', upload.single('file'), importRetailers);
export default router;
