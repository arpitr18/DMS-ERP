import { Router } from 'express';
import { listStates, listCities } from '../controllers/locations.controller.js';
const router = Router();
router.get('/states', listStates);
router.get('/cities', listCities);
export default router;
