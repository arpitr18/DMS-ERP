import { Router } from 'express';
import { createCollection, listCollections, listOutstanding } from '../controllers/collections.controller.js';

const router = Router();
router.get('/outstanding', listOutstanding);
router.get('/', listCollections);
router.post('/', createCollection);
export default router;
