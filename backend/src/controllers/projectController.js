import { projectScope, requireProject, withTenant } from '../lib/tenant.js';
import { publicUser } from '../lib/security.js';
import { randomBytes } from 'node:crypto';

const projectInclude = {
  client: { select: { id: true, name: true, company: true } },
  members: { include: { user: { select: publicUser } } }
};

async function summarize(db, project, user) {
  const [counts] = await db.$queryRaw`SELECT * FROM public.alis_project_progress(${project.id})`;
  const { total, resolved } = counts;
  const { accessToken, ...data } = project;
  return { ...data, ...(user.role === 'ADMIN' ? { accessToken } : {}), progress: {
    total, resolved, percent: total ? Math.floor(resolved / total * 100) : 0,
    label: total === 0 ? 'Sin hitos públicos' : resolved === total ? 'Finalizado' : 'En proceso'
  } };
}

export async function listProjects(req, res, next) {
  try {
    const projects = await withTenant({ user: req.user }, async (db) => {
      const rows = await db.project.findMany({ where: projectScope(req.user), include: projectInclude, orderBy: { createdAt: 'desc' } });
      return Promise.all(rows.map((project) => summarize(db, project, req.user)));
    });
    res.json({ data: projects });
  } catch (error) { next(error); }
}

export async function createProject(req, res, next) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const description = req.body.description;
    const client = req.body.client;
    const initialTickets = req.body.initialTickets ?? [];
    if (!name || name.length > 200 || (description != null && (typeof description !== 'string' || description.length > 100000))) {
      return res.status(400).json({ message: 'Introduce un nombre y una descripción válidos para el proyecto.' });
    }
    if (!Array.isArray(initialTickets) || initialTickets.length > 50 || initialTickets.some((ticket) =>
      !ticket || typeof ticket.title !== 'string' || !ticket.title.trim() || ticket.title.length > 200 ||
      (ticket.assignedToId != null && typeof ticket.assignedToId !== 'string') ||
      (ticket.isVisibleToClient != null && typeof ticket.isVisibleToClient !== 'boolean'))) {
      return res.status(400).json({ message: 'Revisa los tickets iniciales (máximo 50).' });
    }
    if (client && (typeof client.name !== 'string' || !client.name.trim() || client.name.length > 200 ||
      typeof client.company !== 'string' || !client.company.trim() || client.company.length > 200 ||
      typeof client.email !== 'string' || client.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email.trim()))) {
      return res.status(400).json({ message: 'Revisa el nombre, correo y empresa del cliente.' });
    }
    if (!client && (typeof req.body.clientId !== 'string' || !req.body.clientId)) {
      return res.status(400).json({ message: 'Selecciona un cliente o introduce sus datos.' });
    }
    const project = await withTenant({ user: req.user }, async (db) => {
      let clientId = req.body.clientId;
      if (client) {
        const existing = await db.client.findFirst({ where: { email: client.email.trim().toLowerCase(), OR: [
          { createdById: req.user.id }, { projects: { some: projectScope(req.user) } }
        ] } });
        const saved = existing || await db.client.create({ data: {
          name: client.name.trim(), email: client.email.trim().toLowerCase(), company: client.company.trim(), createdById: req.user.id
        } });
        clientId = saved.id;
      } else {
        const existing = await db.client.findFirst({ where: { id: clientId, OR: [
          { createdById: req.user.id }, { projects: { some: projectScope(req.user) } }
        ] } });
        if (!existing) { const error = new Error('Cliente no encontrado o sin acceso.'); error.status = 404; throw error; }
      }
      const created = await db.project.create({ data: { name, description: description?.trim() || null, clientId, createdById: req.user.id, status: 'ACTIVE', accessToken: randomBytes(32).toString('hex') } });
      const memberIds = [...new Set([req.user.id, ...initialTickets.map((ticket) => ticket.assignedToId).filter(Boolean)])];
      await db.projectMember.createMany({ data: memberIds.map((userId) => ({ projectId: created.id, userId })) });
      if (initialTickets.length) await db.ticket.createMany({ data: initialTickets.map((ticket) => ({
        projectId: created.id, title: ticket.title.trim(), assignedUserId: ticket.assignedToId || null, isVisibleToClient: ticket.isVisibleToClient ?? false
      })) });
      await db.activity.create({ data: { userId: req.user.id, projectId: created.id, action: 'PROJECT_CREATED', summary: `Creó el proyecto ${name}` } });
      return summarize(db, await db.project.findUnique({ where: { id: created.id }, include: projectInclude }), req.user);
    });
    res.status(201).json({ data: project });
  } catch (error) { next(error); }
}

export async function deleteProject(req, res, next) {
  try {
    await withTenant({ user: req.user }, async (db) => {
      await requireProject(db, req.user, req.params.id);
      await db.project.delete({ where: { id: req.params.id } });
    });
    res.sendStatus(204);
  } catch (error) { next(error); }
}

export async function addProjectMember(req, res, next) {
  try {
    if (typeof req.body.userId !== 'string' || !req.body.userId) return res.status(400).json({ message: 'Selecciona un usuario.' });
    const membership = await withTenant({ user: req.user }, async (db) => {
      await requireProject(db, req.user, req.params.id);
      return db.projectMember.upsert({
        where: { projectId_userId: { projectId: req.params.id, userId: req.body.userId } },
        create: { projectId: req.params.id, userId: req.body.userId }, update: {}, include: { user: { select: publicUser } }
      });
    });
    res.status(201).json({ data: membership });
  } catch (error) { next(error); }
}

export async function removeProjectMember(req, res, next) {
  try {
    await withTenant({ user: req.user }, async (db) => {
      const project = await requireProject(db, req.user, req.params.id);
      if (req.params.userId === project.createdById || req.params.userId === req.user.id) {
        const error = new Error('No puedes retirar al creador del proyecto ni tu propio acceso.'); error.status = 400; throw error;
      }
      await db.ticket.updateMany({ where: { projectId: project.id, assignedUserId: req.params.userId }, data: { assignedUserId: null } });
      await db.projectMember.deleteMany({ where: { projectId: project.id, userId: req.params.userId } });
    });
    res.sendStatus(204);
  } catch (error) { next(error); }
}
