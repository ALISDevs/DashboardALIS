import { Router } from 'express';
import {
  addTicketComment,
  createTicket,
  listClientTickets,
  listTickets,
  updateTicketStatus
} from '../controllers/ticketController.js';
import { assignTicket } from '../controllers/ticketController.js';
import { authenticate, adminOnly } from '../middlewares/auth.js';

const router = Router();

router.get('/client', listClientTickets);
router.get('/', authenticate, listTickets);
router.post('/', authenticate, adminOnly, createTicket);
router.patch('/:id/status', authenticate, updateTicketStatus);
router.patch('/:id/assignment', authenticate, adminOnly, assignTicket);
router.post('/:id/comments', (req, res, next) => {
  if (typeof req.body.clientToken === 'string' && req.body.clientToken) return next();
  return authenticate(req, res, next);
}, addTicketComment);

export default router;
