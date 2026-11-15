import { Router } from 'express';
import { createInvoice, getInvoice, getInvoicePdf, listInvoices, getRetailerBenefits } from '../controllers/billing.controller.js';

const router = Router();
router.get('/', listInvoices);
router.get('/retailer-benefits/:retailerId',getRetailerBenefits);
router.get('/:id', getInvoice);
router.get('/:id/pdf', getInvoicePdf);
router.post('/', createInvoice);
export default router;
