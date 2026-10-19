import prisma from './prisma.js';
import { termsVersion } from './terms.js';

export function projectScope(user) {
  return { members: { some: { userId: user.id } } };
}

export async function requireProject(db, user, projectId) {
  const project = await db.project.findFirst({ where: { id: projectId, ...projectScope(user) } });
  if (!project) {
    const error = new Error('Proyecto no encontrado o sin acceso.');
    error.status = 404;
    throw error;
  }
  return project;
}

export async function requireAssignee(db, projectId, userId) {
  if (!userId) return;
  const member = await db.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
  if (!member) {
    const error = new Error('El responsable debe pertenecer al equipo del proyecto.');
    error.status = 400;
    throw error;
  }
}

export async function withTenant(context, operation) {
  return prisma.$transaction(async (db) => {
    await db.$executeRaw`SET LOCAL ROLE alis_tenant`;
    await db.$queryRaw`SELECT set_config('alis.user_id', ${context.user?.id || ''}, true), set_config('alis.client_token', ${context.clientToken || ''}, true), set_config('alis.terms_version', ${termsVersion}, true)`;
    return operation(db);
  }, { maxWait: 5000, timeout: 15000 });
}
