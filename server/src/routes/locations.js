import { Router } from 'express';
import { listStates, listCities, captureAddress } from '../controllers/locations.controller.js';
const router = Router();
router.get('/states', listStates);
router.get('/cities', listCities);
router.post('/capture-address', captureAddress);
export default router;
