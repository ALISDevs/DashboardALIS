import { Router } from 'express';
import { createClient } from '../controllers/clientController.js';
import { authenticate, adminOnly } from '../middlewares/auth.js';

const router = Router();

router.post('/', authenticate, adminOnly, createClient);

export default router;
