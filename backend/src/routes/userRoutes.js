import { Router } from 'express';
import { listUsers, createUser } from '../controllers/userController.js';
import { authenticate, adminOnly } from '../middlewares/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', listUsers);
router.post('/', adminOnly, createUser);

export default router;
