import { Router } from 'express';
import { adjustInventory, listInventory, listTransactions } from '../controllers/inventory.controller.js';

const router = Router();
router.get('/', listInventory);
router.post('/adjust', adjustInventory);
router.get('/:productId/transactions', listTransactions);
export default router;
