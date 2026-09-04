import { Router } from 'express';
import multer from 'multer';
import { createProduct, importProducts, listProducts, updateProduct } from '../controllers/products.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.get('/', listProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.post('/import', upload.single('file'), importProducts);
export default router;
