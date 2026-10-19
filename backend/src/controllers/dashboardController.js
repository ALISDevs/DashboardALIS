import { withTenant } from '../lib/tenant.js';
import { hasAcceptedTerms, termsNotice, termsVersion, termsHash } from '../lib/terms.js';

export const publicTicketSelect = {
  id: true, title: true, description: true, category: true, status: true, priority: true,
  isVisibleToClient: true, createdAt: true, updatedAt: true,
  assignedUser: { select: { name: true } },
  comments: { where: { isMilestoneFeedback: true }, select: {
    id: true, body: true, createdAt: true, client: { select: { name: true } }
  }, orderBy: { createdAt: 'asc' } }
};

export async function resolveClientProject(db, clientToken) {
  const project = await db.project.findFirst({ where: { accessToken: clientToken }, select: {
    id: true, name: true, status: true, clientId: true,
    client: { select: { id: true, name: true, company: true, termsAccepted: true, termsAcceptedAt: true, termsVersion: true } }
  } });
  if (!project) { const error = new Error('Enlace no válido o proyecto no disponible.'); error.status = 404; throw error; }
  return project;
}

export async function getClientDashboard(req, res, next) {
  try {
    const clientToken = req.params.clientToken;
    const data = await withTenant({ clientToken }, async (db) => {
      const project = await resolveClientProject(db, clientToken);
      if (!hasAcceptedTerms(project.client)) return { requiresTerms: true, terms: termsNotice };
      const tickets = await db.ticket.findMany({ where: { projectId: project.id, isVisibleToClient: true }, select: publicTicketSelect, orderBy: { updatedAt: 'desc' } });
      return { requiresTerms: false, project, tickets };
    });
    res.json({ data });
  } catch (error) { next(error); }
}

export async function acceptClientTerms(req, res, next) {
  try {
    if (req.body.accepted !== true || req.body.version !== termsVersion) {
      return res.status(400).json({ message: 'Acepta expresamente la versión vigente de los términos.' });
    }
    const result = await withTenant({ clientToken: req.params.clientToken }, async (db) => {
      const project = await resolveClientProject(db, req.params.clientToken);
      await db.$queryRaw`SELECT id FROM public."Client" WHERE id = ${project.clientId} FOR UPDATE`;
      const client = await db.client.findUnique({ where: { id: project.clientId } });
      if (hasAcceptedTerms(client)) return { termsAccepted: true, termsAcceptedAt: client.termsAcceptedAt, termsVersion };
      const acceptedAt = new Date();
      await db.termsAcceptance.create({ data: { clientId: project.clientId, projectId: project.id, termsVersion, termsHash, acceptedAt } });
      await db.client.update({ where: { id: project.clientId }, data: { termsAccepted: true, termsAcceptedAt: acceptedAt, termsVersion }, select: { id: true } });
      return { termsAccepted: true, termsAcceptedAt: acceptedAt, termsVersion };
    });
    res.json({ data: result });
  } catch (error) { next(error); }
}
