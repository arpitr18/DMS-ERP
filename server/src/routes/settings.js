import { Router } from 'express';
import { getBusinessSettings, updateBusinessSettings } from '../controllers/settings.controller.js';
import { distributorRoles } from '../constants/userRoles.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import { updateBusinessSettingsSchema } from '../validations/settings.validation.js';

const router = Router();

router.get('/', getBusinessSettings);
router.put('/', authorize(...distributorRoles), validateBody(updateBusinessSettingsSchema), updateBusinessSettings);

export default router;
