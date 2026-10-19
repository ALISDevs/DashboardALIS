import { Router } from 'express';
import { createProject, listProjects, deleteProject, addProjectMember, removeProjectMember } from '../controllers/projectController.js';
import { authenticate, adminOnly } from '../middlewares/auth.js';
import { listDocuments, createDocument, updateDocument, exportDocuments } from '../controllers/documentController.js';

const router = Router();
router.use(authenticate);

router.get('/', listProjects);
router.post('/', adminOnly, createProject);
router.delete('/:id', adminOnly, deleteProject);
router.post('/:id/members', adminOnly, addProjectMember);
router.delete('/:id/members/:userId', adminOnly, removeProjectMember);
router.get('/:projectId/documents/export', exportDocuments);
router.get('/:projectId/documents', listDocuments);
router.post('/:projectId/documents', createDocument);
router.patch('/:projectId/documents/:documentId', updateDocument);

export default router;
