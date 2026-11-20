import {Router} from 'express';
import {listReturns,invoiceReturnItems,createReturn} from '../controllers/returns.controller.js';
const router=Router();
router.get('/',listReturns);
router.get('/invoice/:id',invoiceReturnItems);
router.post('/',createReturn);
export default router;
