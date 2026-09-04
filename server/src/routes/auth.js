import { Router } from 'express';
import { login } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema } from '../validations/auth.validation.js';

const router = Router();

router.post('/login', validateBody(loginSchema), login);

export default router;
