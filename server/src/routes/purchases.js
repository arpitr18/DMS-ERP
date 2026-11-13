import { Router } from 'express';
import { createPurchase, listPurchases, updatePurchase, deletePurchase, listSuppliers } from '../controllers/purchases.controller.js';

const router = Router();
router.get('/', listPurchases);
router.get('/suppliers', listSuppliers);
router.post('/', createPurchase);
router.put('/:id', updatePurchase);
router.delete('/:id', deletePurchase);
export default router;
