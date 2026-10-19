import { publicUser } from '../lib/security.js';
import { projectScope, requireProject, requireAssignee, withTenant } from '../lib/tenant.js';
import { resolveClientProject, publicTicketSelect } from './dashboardController.js';
import { hasAcceptedTerms } from '../lib/terms.js';

const priorities = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const statuses = new Set(['NEW', 'IN_PROGRESS', 'RESOLVED']);
const statusLabels = { NEW: 'Nuevo', IN_PROGRESS: 'En curso', RESOLVED: 'Resuelto' };
const optionalString = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const ticketInclude = {
  project: { select: { id: true, name: true } }, assignedUser: { select: publicUser },
  comments: { include: { client: { select: { name: true } }, user: { select: { name: true } } }, orderBy: { createdAt: 'asc' } }
};
const ticketScope = (req) => ({ project: projectScope(req.user),
  ...(req.user.role !== 'ADMIN' || req.query.mine === 'true' ? { assignedUserId: req.user.id } : {}) });

export async function listTickets(req, res, next) {
  try {
    const data = await withTenant({ user: req.user }, async (db) => {
      const projectId = optionalString(req.query.projectId);
      if (projectId) await requireProject(db, req.user, projectId);
      return db.ticket.findMany({ where: { ...ticketScope(req), ...(projectId ? { projectId } : {}) }, include: ticketInclude, orderBy: { updatedAt: 'desc' } });
    });
    res.json({ data });
  } catch (error) { next(error); }
}

export async function listClientTickets(req, res, next) {
  try {
    const clientToken = optionalString(req.query.clientToken);
    if (!clientToken) return res.status(400).json({ message: 'Se requiere el enlace del proyecto.' });
    const data = await withTenant({ clientToken }, async (db) => {
      const project = await resolveClientProject(db, clientToken);
      if (!hasAcceptedTerms(project.client)) { const error = new Error('Acepta los términos antes de consultar los hitos.'); error.status = 403; throw error; }
      return db.ticket.findMany({ where: { projectId: project.id, isVisibleToClient: true }, select: publicTicketSelect });
    });
    res.json({ data });
  } catch (error) { next(error); }
}

export async function createTicket(req, res, next) {
  try {
    const title = optionalString(req.body.title);
    const projectId = optionalString(req.body.projectId);
    const priority = req.body.priority ?? 'MEDIUM';
    const isVisibleToClient = req.body.isVisibleToClient ?? false;
    if (!title || title.length > 200 || !projectId || !priorities.has(priority) || typeof isVisibleToClient !== 'boolean' ||
      (req.body.description != null && (typeof req.body.description !== 'string' || req.body.description.length > 100000)) ||
      (req.body.category != null && (typeof req.body.category !== 'string' || req.body.category.length > 100)) ||
      (req.body.assignedToId != null && typeof req.body.assignedToId !== 'string')) {
      return res.status(400).json({ message: 'Revisa el título, proyecto, prioridad y responsable del ticket.' });
    }
    const ticket = await withTenant({ user: req.user }, async (db) => {
      await requireProject(db, req.user, projectId);
      const assignedUserId = optionalString(req.body.assignedToId);
      await requireAssignee(db, projectId, assignedUserId);
      const created = await db.ticket.create({ data: {
        title, projectId, priority, isVisibleToClient, assignedUserId,
        description: optionalString(req.body.description), category: optionalString(req.body.category)
      }, include: ticketInclude });
      await db.activity.create({ data: { userId: req.user.id, projectId, action: 'TICKET_CREATED', summary: `Creó el ticket ${title}` } });
      return created;
    });
    res.status(201).json({ data: ticket });
  } catch (error) { next(error); }
}

export async function updateTicketStatus(req, res, next) {
  try {
    const status = req.body.status;
    if (!statuses.has(status)) return res.status(400).json({ message: 'El estado debe ser NEW, IN_PROGRESS o RESOLVED.' });
    const ticket = await withTenant({ user: req.user }, async (db) => {
      const updated = await db.ticket.updateMany({ where: { id: req.params.id, ...ticketScope(req) }, data: { status } });
      if (!updated.count) return null;
      const saved = await db.ticket.findFirst({ where: { id: req.params.id, ...ticketScope(req) }, include: ticketInclude });
      await db.activity.create({ data: { userId: req.user.id, projectId: saved.projectId, action: 'TICKET_STATUS', summary: `${saved.title}: ${statusLabels[status]}` } });
      return saved;
    });
    if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado o sin acceso.' });
    res.json({ data: ticket });
  } catch (error) { next(error); }
}

export async function assignTicket(req, res, next) {
  try {
    if (req.body.assignedToId !== null && typeof req.body.assignedToId !== 'string') return res.status(400).json({ message: 'Selecciona un responsable válido.' });
    const ticket = await withTenant({ user: req.user }, async (db) => {
      const existing = await db.ticket.findFirst({ where: { id: req.params.id, project: projectScope(req.user) } });
      if (!existing) return null;
      const assignedUserId = optionalString(req.body.assignedToId);
      await requireAssignee(db, existing.projectId, assignedUserId);
      const saved = await db.ticket.update({ where: { id: existing.id }, data: { assignedUserId }, include: ticketInclude });
      await db.activity.create({ data: { userId: req.user.id, projectId: saved.projectId, action: 'TICKET_ASSIGNED', summary: `Asignó ${saved.title} a ${saved.assignedUser?.name || 'sin responsable'}` } });
      return saved;
    });
    if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado o sin acceso.' });
    res.json({ data: ticket });
  } catch (error) { next(error); }
}

export async function addTicketComment(req, res, next) {
  try {
    const body = optionalString(req.body.body);
    if (!body || body.length > 10000) return res.status(400).json({ message: 'Escribe un comentario de hasta 10 000 caracteres.' });
    const clientToken = req.user ? '' : optionalString(req.body.clientToken);
    const comment = await withTenant({ user: req.user, clientToken }, async (db) => {
      let clientId = null;
      let where = { id: req.params.id };
      if (req.user) where = { ...where, ...ticketScope(req) };
      else {
        const project = await resolveClientProject(db, clientToken);
        if (!hasAcceptedTerms(project.client)) { const error = new Error('Acepta los términos antes de enviar comentarios.'); error.status = 403; throw error; }
        where = { ...where, projectId: project.id, isVisibleToClient: true };
        clientId = project.clientId;
      }
      const ticket = await db.ticket.findFirst({ where });
      if (!ticket) return null;
      return db.comment.create({ data: { body, ticketId: ticket.id, clientId, userId: req.user?.id || null, isMilestoneFeedback: Boolean(clientId) },
        include: { client: { select: { name: true } }, user: { select: { name: true } } } });
    });
    if (!comment) return res.status(404).json({ message: 'Ticket no encontrado o sin acceso.' });
    res.status(201).json({ data: comment });
  } catch (error) { next(error); }
}
