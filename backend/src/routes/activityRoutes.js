import { Router } from 'express';
import { withTenant, projectScope, requireProject } from '../lib/tenant.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();
router.get('/', authenticate, async (req, res, next) => {
  try {
    const projectId = typeof req.query.projectId === 'string' && req.query.projectId ? req.query.projectId : '';
    const data = await withTenant({ user: req.user }, async (db) => {
      if (projectId) await requireProject(db, req.user, projectId);
      return db.activity.findMany({ where: { project: projectScope(req.user), ...(projectId ? { projectId } : {}) }, take: 50, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } }
      });
    });
    res.json({ data });
  } catch (error) { next(error); }
});
export default router;
