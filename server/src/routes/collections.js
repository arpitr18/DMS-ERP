import { Router } from 'express';
import { createCollection, listCollections, listOutstanding,createCredit,listCredits } from '../controllers/collections.controller.js';

const router = Router();
router.get('/credits',listCredits);
router.post('/credits',createCredit);
router.get('/outstanding', listOutstanding);
router.get('/', listCollections);
router.post('/', createCollection);
export default router;
