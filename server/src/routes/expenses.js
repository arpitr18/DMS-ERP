import { Router } from 'express';
import { createExpense, deleteExpense, listCategories, listExpenses, updateExpense } from '../controllers/expenses.controller.js';

const router = Router();
router.get('/categories', listCategories);
router.get('/', listExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);
export default router;
