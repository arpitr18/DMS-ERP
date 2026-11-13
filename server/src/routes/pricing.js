import { Router } from 'express';
import multer from 'multer';
import { deleteRetailerPrice, importRetailerPrices, listRetailerPrices, setRetailerPrice } from '../controllers/pricing.controller.js';

import { downloadTemplate } from '../controllers/templates.controller.js';
const router = Router();
router.get('/template', downloadTemplate('pricing'));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.get('/:retailerId', listRetailerPrices);
router.put('/:retailerId/:productId', setRetailerPrice);
router.delete('/:retailerId/:productId', deleteRetailerPrice);
router.post('/import/file', upload.single('file'), importRetailerPrices);
export default router;
