import { Router } from 'express';
import { createPurchase, listPurchases } from '../controllers/purchases.controller.js';

const router = Router();
router.get('/', listPurchases);
router.post('/', createPurchase);
export default router;
