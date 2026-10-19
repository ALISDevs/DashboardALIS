import { requireProject, withTenant } from '../lib/tenant.js';

const include = { author: { select: { id: true, name: true } } };

function validDocument(body) {
  return typeof body.title === 'string' && body.title.trim().length > 0 && body.title.length <= 200 &&
    typeof body.content === 'string' && body.content.length <= 200000;
}

export async function listDocuments(req, res, next) {
  try {
    const documents = await withTenant({ user: req.user }, async (db) => {
      await requireProject(db, req.user, req.params.projectId);
      return db.document.findMany({ where: { projectId: req.params.projectId }, include, orderBy: { createdAt: 'asc' } });
    });
    res.json({ data: documents });
  } catch (error) { next(error); }
}

export async function createDocument(req, res, next) {
  try {
    if (!validDocument(req.body)) return res.status(400).json({ message: 'Introduce un título y contenido Markdown válido (máximo 200 000 caracteres).' });
    const document = await withTenant({ user: req.user }, async (db) => {
      await requireProject(db, req.user, req.params.projectId);
      const doc = await db.document.create({ data: { title: req.body.title.trim(), content: req.body.content, projectId: req.params.projectId, authorId: req.user.id }, include });
      await db.activity.create({ data: { userId: req.user.id, projectId: doc.projectId, action: 'DOCUMENT_CREATED', summary: `Creó el documento ${doc.title}` } });
      return doc;
    });
    res.status(201).json({ data: document });
  } catch (error) { next(error); }
}

export async function updateDocument(req, res, next) {
  try {
    if (!validDocument(req.body) || typeof req.body.updatedAt !== 'string' || Number.isNaN(Date.parse(req.body.updatedAt))) {
      return res.status(400).json({ message: 'Incluye título, contenido y la versión del documento.' });
    }
    const document = await withTenant({ user: req.user }, async (db) => {
      await requireProject(db, req.user, req.params.projectId);
      const result = await db.document.updateMany({
        where: { id: req.params.documentId, projectId: req.params.projectId, updatedAt: new Date(req.body.updatedAt) },
        data: { title: req.body.title.trim(), content: req.body.content, authorId: req.user.id }
      });
      if (!result.count) return null;
      const doc = await db.document.findFirst({ where: { id: req.params.documentId, projectId: req.params.projectId }, include });
      await db.activity.create({ data: { userId: req.user.id, projectId: doc.projectId, action: 'DOCUMENT_UPDATED', summary: `Actualizó el documento ${doc.title}` } });
      return doc;
    });
    if (!document) return res.status(409).json({ message: 'El documento cambió o no existe. Recarga su última versión antes de guardar.' });
    res.json({ data: document });
  } catch (error) { next(error); }
}

export async function exportDocuments(req, res, next) {
  try {
    const project = await withTenant({ user: req.user }, async (db) => {
      await requireProject(db, req.user, req.params.projectId);
      return db.project.findFirst({ where: { id: req.params.projectId }, include: { documents: { orderBy: { createdAt: 'asc' } } } });
    });
    const content = [`# ${project.name}`, ...project.documents.map((doc) => `## ${doc.title}\n\n${doc.content}`)].join('\n\n---\n\n');
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="proyecto-${project.id}.md"`);
    res.send(content);
  } catch (error) { next(error); }
}
