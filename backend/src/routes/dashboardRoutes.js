import { Router } from 'express';
import { getClientDashboard, acceptClientTerms } from '../controllers/dashboardController.js';

const router = Router();

router.get('/:clientToken', getClientDashboard);
router.post('/:clientToken/terms', acceptClientTerms);

export default router;
