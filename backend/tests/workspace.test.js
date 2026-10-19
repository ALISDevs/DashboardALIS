import 'dotenv/config';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import app from '../src/app.js';
import prisma from '../prisma/adminDatabase.js';
import runtimeDatabase from '../src/lib/prisma.js';
import { withTenant } from '../src/lib/tenant.js';
import { termsVersion } from '../src/lib/terms.js';
import { cookieOptions } from '../src/lib/session.js';
import { hashPassword } from '../src/lib/security.js';
import { projectProgress } from '../src/lib/projectProgress.js';

test('roles, tareas, documentos y eliminación de proyectos', async (t) => {
  const runId = randomBytes(8).toString('hex');
  const password = randomBytes(24).toString('hex');
  const fixtureUserIds = [];
  const clientEmails = [`project-${runId}@test.invalid`, `rollback-${runId}@test.invalid`, `other-${runId}@test.invalid`];
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    const clients = await prisma.client.findMany({ where: { email: { in: clientEmails } } });
    await prisma.project.deleteMany({ where: { clientId: { in: clients.map((client) => client.id) } } });
    await prisma.termsAcceptance.deleteMany({ where: { clientId: { in: clients.map((client) => client.id) } } });
    await prisma.client.deleteMany({ where: { id: { in: clients.map((client) => client.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
    await prisma.$disconnect();
    await runtimeDatabase.$disconnect();
  });

  async function call(path, { token, method = 'GET', body } = {}) {
    const response = await fetch(`${base}${path}`, {
      method, headers: { Origin: process.env.TICKETS_ALIS_ORIGIN, 'X-ALIS-Request': '1', ...(token ? { Cookie: token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const content = await response.text();
    return { status: response.status, headers: response.headers, payload: content && response.headers.get('content-type')?.includes('application/json') ? JSON.parse(content) : content };
  }

  const makeUser = async (name, role) => {
    const user = await prisma.user.create({ data: { name, role, username: `${name.replaceAll('-', '_')}_${runId}`, email: `${name}-${runId}@test.invalid`, passwordHash: await hashPassword(password) } });
    fixtureUserIds.push(user.id);
    return user;
  };
  const admin = await makeUser('admin', 'ADMIN');
  const member = await makeUser('member', 'MEMBER');
  const teammate = await makeUser('teammate', 'MEMBER');
  const outsiderAdmin = await makeUser('outsider-admin', 'ADMIN');
  const outsiderMember = await makeUser('outsider-member', 'MEMBER');
  let adminToken, memberToken, project, ownTicket, otherTicket, publicTicket, document;

  await t.test('exige sesión y valida credenciales sin exponer hashes', async () => {
    assert.equal((await call('/projects')).status, 401);
    assert.equal((await call('/tickets')).status, 401);
    assert.equal((await call('/auth/login', { method: 'POST', body: { email: admin.email, password: 'incorrecta' } })).status, 401);
    const login = await call('/auth/login', { method: 'POST', body: { email: admin.email, password } });
    assert.equal(login.status, 200);
    adminToken = login.headers.get('set-cookie').split(';')[0];
    assert.equal(login.payload.data.token, undefined);
    assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
    assert.match(login.headers.get('set-cookie'), /SameSite=Strict/i);
    assert.match(login.headers.get('set-cookie'), /Path=\/api/i);
    assert.equal(login.payload.data.user.passwordHash, undefined);
    memberToken = (await call('/auth/login', { method: 'POST', body: { email: member.email, password } })).headers.get('set-cookie').split(';')[0];
    const users = await call('/users', { token: adminToken });
    assert.ok(users.payload.data.every((user) => !('passwordHash' in user)));
    assert.equal((await call('/users', { token: memberToken, method: 'POST', body: {} })).status, 403);
  });

  await t.test('acepta nombres de usuario sin distinguir mayúsculas y mantiene el acceso por correo', async () => {
    const result = await call('/auth/login', { method: 'POST', body: { identifier: admin.username.toUpperCase(), password } });
    assert.equal(result.status, 200);
    assert.equal(result.payload.data.user.id, admin.id);
    assert.equal(result.payload.data.user.username, admin.username);
    assert.equal(result.payload.data.token, undefined);
    assert.equal((await call('/auth/login', { method: 'POST', body: { identifier: member.username, password: 'incorrecta' } })).status, 401);
    assert.equal((await call('/auth/login', { method: 'POST', body: { identifier: { username: admin.username }, password } })).status, 400);
  });

  await t.test('solo el administrador crea proyectos con tickets iniciales', async () => {
    assert.equal((await call('/projects', { token: memberToken, method: 'POST', body: { name: 'Prohibido' } })).status, 403);
    assert.equal((await call('/clients', { token: memberToken, method: 'POST', body: {} })).status, 403);
    const created = await call('/projects', { token: adminToken, method: 'POST', body: {
      name: `Proyecto ${runId}`, description: '# Alcance',
      client: { name: 'Cliente prueba', email: clientEmails[0], company: 'Empresa prueba' },
      initialTickets: [{ title: 'Tarea privada propia', assignedToId: member.id, isVisibleToClient: false }, { title: 'Tarea privada de compañero', assignedToId: teammate.id }]
    } });
    assert.equal(created.status, 201);
    project = created.payload.data;
    assert.equal(project.progress.total, 0);
    assert.equal(project.progress.label, 'Sin hitos públicos');
    const tickets = (await call(`/tickets?projectId=${project.id}`, { token: adminToken })).payload.data;
    ownTicket = tickets.find((ticket) => ticket.assignedUserId === member.id);
    otherTicket = tickets.find((ticket) => ticket.assignedUserId === teammate.id);
    assert.equal(tickets.length, 2);
    assert.ok(tickets.every((ticket) => !ticket.assignedUser.passwordHash));
  });

  await t.test('los términos bloquean datos y comentarios antes de una aceptación explícita y versionada', async () => {
    const before = await call(`/dashboard/${project.accessToken}`);
    assert.equal(before.payload.data.requiresTerms, true);
    assert.equal(before.payload.data.project, undefined);
    assert.equal(before.payload.data.tickets, undefined);
    assert.ok(before.payload.data.terms.content);
    assert.equal((await call(`/tickets/client?clientToken=${project.accessToken}`)).status, 403);
    assert.equal((await call(`/tickets/${ownTicket.id}/comments`, { method: 'POST', body: { body: 'Sin aceptar', clientToken: project.accessToken } })).status, 403);
    assert.equal((await call(`/dashboard/${project.accessToken}/terms`, { method: 'POST', body: { accepted: false, version: termsVersion } })).status, 400);
    assert.equal((await call(`/dashboard/${project.accessToken}/terms`, { method: 'POST', body: { accepted: true, version: 'antigua' } })).status, 400);
    const acceptance = await call(`/dashboard/${project.accessToken}/terms`, { method: 'POST', body: { accepted: true, version: termsVersion } });
    assert.equal(acceptance.status, 200);
    assert.equal(acceptance.payload.data.termsAccepted, true);
    await call(`/dashboard/${project.accessToken}/terms`, { method: 'POST', body: { accepted: true, version: termsVersion } });
    const records = await prisma.termsAcceptance.findMany({ where: { clientId: project.clientId } });
    assert.equal(records.length, 1);
    assert.equal(records[0].termsHash, before.payload.data.terms.hash);
    await assert.rejects(() => withTenant({ clientToken: project.accessToken }, (db) => db.termsAcceptance.updateMany({ where: { clientId: project.clientId }, data: { termsHash: 'alterado' } })));
    assert.equal((await prisma.client.findUnique({ where: { id: project.clientId } })).termsAccepted, true);
  });

  await t.test('revierte cliente y proyecto si falla un responsable inicial', async () => {
    const result = await call('/projects', { token: adminToken, method: 'POST', body: {
      name: 'No debe persistir', client: { name: 'Rollback', company: 'Test', email: clientEmails[1] },
      initialTickets: [{ title: 'Tarea inválida', assignedToId: 'no-existe' }]
    } });
    assert.equal(result.status, 400);
    assert.equal(await prisma.client.count({ where: { email: clientEmails[1] } }), 0);
  });

  await t.test('el miembro solo obtiene y modifica sus tareas, incluso alterando filtros', async () => {
    const result = await call(`/tickets?projectId=${project.id}&mine=false&assignedToId=${teammate.id}`, { token: memberToken });
    assert.deepEqual(result.payload.data.map((ticket) => ticket.id), [ownTicket.id]);
    assert.equal((await call(`/tickets/${otherTicket.id}/status`, { token: memberToken, method: 'PATCH', body: { status: 'RESOLVED' } })).status, 404);
    assert.equal((await call(`/tickets/${ownTicket.id}/status`, { token: memberToken, method: 'PATCH', body: { status: 'IN_PROGRESS' } })).status, 200);
    assert.equal((await call('/tickets', { token: memberToken, method: 'POST', body: { title: 'Bloqueado', projectId: project.id } })).status, 403);
    assert.equal((await call(`/tickets/${ownTicket.id}/assignment`, { token: memberToken, method: 'PATCH', body: { assignedToId: teammate.id } })).status, 403);
    assert.equal((await call(`/tickets/${otherTicket.id}/assignment`, { token: adminToken, method: 'PATCH', body: { assignedToId: member.id } })).status, 200);
  });

  await t.test('el progreso y el portal usan exclusivamente tickets públicos', async () => {
    const created = await call('/tickets', { token: adminToken, method: 'POST', body: {
      title: 'Hito público', projectId: project.id, assignedToId: member.id, isVisibleToClient: true
    } });
    publicTicket = created.payload.data;
    await call(`/tickets/${publicTicket.id}/status`, { token: memberToken, method: 'PATCH', body: { status: 'RESOLVED' } });
    const projects = (await call('/projects', { token: memberToken })).payload.data;
    const summary = projects.find((item) => item.id === project.id);
    assert.deepEqual(summary.progress, { total: 1, resolved: 1, percent: 100, label: 'Finalizado' });
    assert.equal(summary.accessToken, undefined);
    const dashboard = await call(`/dashboard/${project.accessToken}`);
    assert.deepEqual(dashboard.payload.data.tickets.map((ticket) => ticket.id), [publicTicket.id]);
    assert.equal(projectProgress([{ isVisibleToClient: true, status: 'NEW' }]).label, 'En proceso');
  });

  await t.test('los comentarios del cliente requieren el token correcto y un ticket público', async () => {
    assert.equal((await call(`/tickets/${publicTicket.id}/comments`, { method: 'POST', body: { body: 'No autorizado', clientId: project.clientId } })).status, 401);
    assert.equal((await call(`/tickets/${publicTicket.id}/comments`, { method: 'POST', body: { body: 'Otro proyecto', clientToken: 'incorrecto' } })).status, 404);
    assert.equal((await call(`/tickets/${ownTicket.id}/comments`, { method: 'POST', body: { body: 'Privado', clientToken: project.accessToken } })).status, 404);
    assert.equal((await call(`/tickets/${publicTicket.id}/comments`, { method: 'POST', body: { body: 'Aprobado', clientToken: project.accessToken, clientId: 'ignorado' } })).status, 201);
  });

  await t.test('todo el equipo edita documentos con control de versiones y exporta Markdown', async () => {
    const created = await call(`/projects/${project.id}/documents`, { token: memberToken, method: 'POST', body: { title: 'Arquitectura', content: '# Decisiones\n\n- React y Express' } });
    assert.equal(created.status, 201);
    document = created.payload.data;
    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = await call(`/projects/${project.id}/documents/${document.id}`, { token: adminToken, method: 'PATCH', body: { title: 'Arquitectura', content: '# Decisiones\n\n- PostgreSQL', updatedAt: document.updatedAt } });
    assert.equal(updated.status, 200);
    assert.equal((await call(`/projects/${project.id}/documents/${document.id}`, { token: memberToken, method: 'PATCH', body: { title: 'Vieja', content: 'Desactualizada', updatedAt: document.updatedAt } })).status, 409);
    const exported = await call(`/projects/${project.id}/documents/export`, { token: memberToken });
    assert.equal(exported.status, 200);
    assert.match(exported.headers.get('content-disposition'), /attachment.*\.md/);
    assert.match(exported.payload, /PostgreSQL/);
    assert.match(exported.payload, /Arquitectura/);
    assert.equal((await call(`/projects/${project.id}/documents/export`)).status, 401);
  });

  await t.test('el feed registra acciones de los compañeros', async () => {
    const feed = await call(`/activity?projectId=${project.id}`, { token: memberToken });
    assert.ok(feed.payload.data.some((activity) => activity.userId === admin.id && activity.action === 'DOCUMENT_UPDATED'));
    assert.ok(feed.payload.data.some((activity) => activity.userId === member.id && activity.action === 'TICKET_STATUS'));
    assert.ok(feed.payload.data.every((activity) => !activity.user.passwordHash));
  });

  await t.test('el administrador puede registrar miembros sin elevar su rol', async () => {
    const email = `registered-${runId}@test.invalid`;
    const result = await call('/users', { token: adminToken, method: 'POST', body: { name: 'Nuevo miembro', email, password, role: 'ADMIN' } });
    assert.equal(result.status, 201);
    fixtureUserIds.push(result.payload.data.id);
    assert.equal(result.payload.data.role, 'MEMBER');
    assert.equal((await call('/auth/login', { method: 'POST', body: { email, password } })).status, 200);
  });

  await t.test('protege contra CSRF y rechaza cookies alteradas y Authorization legado', async () => {
    for (const origin of [null, 'https://otro-sitio.invalid']) {
      const response = await fetch(`${base}/projects/${project.id}`, { method: 'DELETE', headers: { Cookie: adminToken, 'X-ALIS-Request': '1', ...(origin ? { Origin: origin } : {}) } });
      assert.equal(response.status, 403);
    }
    const missingHeader = await fetch(`${base}/projects/${project.id}`, { method: 'DELETE', headers: { Origin: process.env.TICKETS_ALIS_ORIGIN, Cookie: adminToken } });
    assert.equal(missingHeader.status, 403);
    const altered = adminToken.replace('alis_session=', 'alis_session=x');
    assert.equal((await call('/auth/me', { token: altered })).status, 401);
    const bearer = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${adminToken.split('=')[1]}` } });
    assert.equal(bearer.status, 401);
    const previousEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    assert.equal(cookieOptions().secure, true);
    assert.equal(cookieOptions().httpOnly, true);
    assert.equal(cookieOptions().sameSite, 'strict');
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  });

  await t.test('aisla proyectos incluso entre administradores y valida la pertenencia del responsable', async () => {
    const outsiderCookie = (await call('/auth/login', { method: 'POST', body: { email: outsiderAdmin.email, password } })).headers.get('set-cookie').split(';')[0];
    const outsiderMemberCookie = (await call('/auth/login', { method: 'POST', body: { email: outsiderMember.email, password } })).headers.get('set-cookie').split(';')[0];
    const result = await call('/projects', { token: outsiderCookie, method: 'POST', body: {
      name: 'Proyecto de otro equipo', client: { name: 'Otro cliente', company: 'Otra empresa', email: clientEmails[2] },
      initialTickets: [{ title: 'Secreto de otro equipo', assignedToId: outsiderMember.id, isVisibleToClient: true }]
    } });
    assert.equal(result.status, 201);
    const otherProject = result.payload.data;
    const otherTicket = (await prisma.ticket.findFirst({ where: { projectId: otherProject.id } }));
    assert.equal((await withTenant({ clientToken: otherProject.accessToken }, (db) => db.ticket.findMany())).length, 0);
    for (const token of [outsiderCookie, outsiderMemberCookie]) {
      const visible = (await call('/projects', { token })).payload.data;
      assert.ok(visible.some((item) => item.id === otherProject.id));
      assert.ok(visible.every((item) => item.id !== project.id));
      for (const path of [`/projects/${project.id}/documents`, `/projects/${project.id}/documents/export`, `/tickets?projectId=${project.id}`, `/activity?projectId=${project.id}`]) {
        assert.equal((await call(path, { token })).status, 404, path);
      }
      assert.equal((await call(`/projects/${project.id}/documents`, { token, method: 'POST', body: { title: 'Intrusión', content: 'Denegado' } })).status, 404);
      assert.equal((await call(`/projects/${project.id}/documents/${document.id}`, { token, method: 'PATCH', body: { title: 'Intrusión', content: 'Denegado', updatedAt: document.updatedAt } })).status, 404);
      const feed = (await call('/activity', { token })).payload.data;
      assert.ok(feed.every((item) => item.projectId !== project.id));
    }
    assert.equal((await call(`/projects/${project.id}`, { token: outsiderCookie, method: 'DELETE' })).status, 404);
    assert.equal((await call(`/tickets/${publicTicket.id}/status`, { token: outsiderCookie, method: 'PATCH', body: { status: 'NEW' } })).status, 404);
    assert.equal((await call(`/tickets/${publicTicket.id}/assignment`, { token: outsiderCookie, method: 'PATCH', body: { assignedToId: outsiderAdmin.id } })).status, 404);
    assert.equal((await call('/tickets', { token: outsiderCookie, method: 'POST', body: { title: 'Cruce', projectId: project.id } })).status, 404);
    assert.equal((await call(`/projects/${project.id}/members`, { token: outsiderCookie, method: 'POST', body: { userId: outsiderAdmin.id } })).status, 404);
    assert.equal((await call(`/tickets/${publicTicket.id}/assignment`, { token: adminToken, method: 'PATCH', body: { assignedToId: outsiderMember.id } })).status, 400);

    await call(`/dashboard/${otherProject.accessToken}/terms`, { method: 'POST', body: { accepted: true, version: termsVersion } });
    assert.equal((await call(`/tickets/${publicTicket.id}/comments`, { method: 'POST', body: { body: 'Cruce de cliente', clientToken: otherProject.accessToken } })).status, 404);
    assert.equal((await call(`/tickets/${otherTicket.id}/comments`, { method: 'POST', body: { body: 'Cruce de cliente', clientToken: project.accessToken } })).status, 404);
    const publicList = (await call(`/tickets/client?clientToken=${project.accessToken}&projectId=${otherProject.id}`)).payload.data;
    assert.deepEqual(publicList.map((ticket) => ticket.id), [publicTicket.id]);
    assert.equal(publicList[0].projectId, undefined);
    assert.equal(publicList[0].assignedUserId, undefined);

    const [ownRows, otherRows] = await Promise.all([
      withTenant({ user: admin }, (db) => db.project.findMany()),
      withTenant({ user: outsiderAdmin }, (db) => db.project.findMany())
    ]);
    assert.ok(ownRows.every((row) => row.id !== otherProject.id));
    assert.ok(otherRows.every((row) => row.id !== project.id));
    const rawTickets = await withTenant({ user: member }, (db) => db.ticket.findMany());
    assert.ok(rawTickets.every((ticket) => ticket.projectId === project.id && ticket.assignedUserId === member.id));
    const rawDocuments = await withTenant({ user: outsiderAdmin }, (db) => db.document.findMany());
    assert.ok(rawDocuments.every((doc) => doc.projectId !== project.id));
    const rawComments = await withTenant({ user: outsiderAdmin }, (db) => db.comment.findMany());
    assert.ok(rawComments.every((comment) => comment.ticketId !== publicTicket.id));
    const forbiddenChange = await withTenant({ user: outsiderAdmin }, (db) => db.ticket.updateMany({ where: { id: publicTicket.id }, data: { status: 'NEW' } }));
    assert.equal(forbiddenChange.count, 0);
    const anonymousRows = await withTenant({}, (db) => db.project.findMany());
    assert.equal(anonymousRows.length, 0);
    await assert.rejects(() => runtimeDatabase.project.findMany());
    const [role] = await runtimeDatabase.$queryRaw`SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
    assert.equal(role.current_user, 'alis_app');
    assert.equal(role.rolsuper, false);
    assert.equal(role.rolbypassrls, false);

    assert.equal((await call(`/projects/${project.id}/members`, { token: adminToken, method: 'POST', body: { userId: outsiderMember.id } })).status, 201);
    assert.equal((await call(`/projects/${project.id}/documents`, { token: outsiderMemberCookie })).status, 200);
    assert.equal((await call(`/projects/${project.id}/members/${outsiderMember.id}`, { token: adminToken, method: 'DELETE' })).status, 204);
    assert.equal((await call(`/projects/${project.id}/documents`, { token: outsiderMemberCookie })).status, 404);
  });

  await t.test('rechaza eliminar proyectos sin sesión o con rol de miembro', async () => {
    assert.equal((await call(`/projects/${project.id}`, { method: 'DELETE' })).status, 401);
    assert.equal((await call(`/projects/${project.id}`, { token: memberToken, method: 'DELETE' })).status, 403);
    assert.equal(await prisma.project.count({ where: { id: project.id } }), 1);
  });

  await t.test('CORS permite DELETE y peticiones con cookies exclusivamente desde los orígenes autorizados', async () => {
    const response = await fetch(`${base}/projects/${project.id}`, { method: 'OPTIONS', headers: {
      Origin: process.env.TICKETS_ALIS_ORIGIN,
      'Access-Control-Request-Method': 'DELETE', 'Access-Control-Request-Headers': 'x-alis-request'
    } });
    assert.equal(response.status, 204);
    assert.match(response.headers.get('access-control-allow-methods'), /DELETE/);
    assert.match(response.headers.get('access-control-allow-headers'), /X-ALIS-Request/);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  });

  await t.test('elimina en cascada tickets, comentarios, documentos y actividad; conserva al cliente', async () => {
    const ticketIds = (await prisma.ticket.findMany({ where: { projectId: project.id }, select: { id: true } })).map((ticket) => ticket.id);
    assert.ok(await prisma.comment.count({ where: { ticketId: { in: ticketIds } } }));
    assert.ok(await prisma.document.count({ where: { projectId: project.id } }));
    assert.ok(await prisma.activity.count({ where: { projectId: project.id } }));
    assert.equal((await call(`/projects/${project.id}`, { token: adminToken, method: 'DELETE' })).status, 204);
    assert.equal(await prisma.project.count({ where: { id: project.id } }), 0);
    assert.equal(await prisma.ticket.count({ where: { projectId: project.id } }), 0);
    assert.equal(await prisma.comment.count({ where: { ticketId: { in: ticketIds } } }), 0);
    assert.equal(await prisma.document.count({ where: { projectId: project.id } }), 0);
    assert.equal(await prisma.activity.count({ where: { projectId: project.id } }), 0);
    const retainedAcceptance = await prisma.termsAcceptance.findFirst({ where: { clientId: project.clientId } });
    assert.ok(retainedAcceptance);
    assert.equal(retainedAcceptance.projectId, null);
    assert.equal(await prisma.client.count({ where: { id: project.clientId } }), 1);
    assert.equal((await call(`/dashboard/${project.accessToken}`)).status, 404);
    assert.equal((await call(`/projects/${project.id}`, { token: adminToken, method: 'DELETE' })).status, 404);
  });

  await t.test('cerrar sesión invalida la credencial de sesión', async () => {
    assert.equal((await call('/auth/logout', { token: memberToken, method: 'POST' })).status, 204);
    assert.equal((await call('/auth/me', { token: memberToken })).status, 401);
  });
});
