import { Router } from 'express';
import { changePassword, getProfile, updateProfile } from '../controllers/profile.controller.js';
import { validateBody } from '../middleware/validate.js';
import { changePasswordSchema, updateProfileSchema } from '../validations/profile.validation.js';

const router = Router();

router.get('/', getProfile);
router.put('/', validateBody(updateProfileSchema), updateProfile);
router.put('/password', validateBody(changePasswordSchema), changePassword);

export default router;
