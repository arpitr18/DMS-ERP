import { Router } from 'express';
import { listSchemes, createScheme, cancelScheme, modifyScheme } from '../controllers/schemes.controller.js';
const router = Router();
router.get('/', listSchemes);
router.post('/', createScheme);
router.patch('/:id/cancel', cancelScheme);
router.patch('/:id', modifyScheme);
export default router;
