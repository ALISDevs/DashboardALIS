import React, { useEffect, useState } from 'react';
import { getDocuments, createDocument, updateDocument, exportDocuments } from '../../shared/api/tickets.js';
import { Download, Save } from 'lucide-react';
import { GlassCard } from '../../shared/ui/GlassCard.jsx';

export function Documentation({ projects, onSaved }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({ title: '', content: '' });
  const [state, setState] = useState('loading');
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!projects.some((project) => project.id === projectId)) {
      setProjectId(projects[0]?.id || '');
      setDirty(false);
    }
  }, [projects, projectId]);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setError('');
    setNotice('');
    if (!projectId) { setState('ready'); return; }
    getDocuments(projectId).then((data) => {
      if (cancelled) return;
      setDocuments(data);
      const first = data[0];
      setSelectedId(first?.id || '');
      setForm({ title: first?.title || '', content: first?.content || '' });
      setDirty(false);
      setState('ready');
    }).catch((failure) => { if (!cancelled) { setError(failure.message); setState('error'); } });
    return () => { cancelled = true; };
  }, [projectId, reloadKey]);

  useEffect(() => {
    function beforeUnload(event) { if (dirty) event.preventDefault(); }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  function selectDocument(id) {
    const doc = documents.find((item) => item.id === id);
    setSelectedId(id);
    setForm({ title: doc?.title || '', content: doc?.content || '' });
    setDirty(false);
    setNotice('');
    setError('');
  }

  function edit(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
    setNotice('');
  }

  async function save(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const selected = documents.find((doc) => doc.id === selectedId);
      const saved = selected
        ? await updateDocument(projectId, selectedId, { ...form, updatedAt: selected.updatedAt })
        : await createDocument(projectId, form);
      setDocuments((current) => selected ? current.map((doc) => doc.id === saved.id ? saved : doc) : [...current, saved]);
      setSelectedId(saved.id);
      setForm({ title: saved.title, content: saved.content });
      setDirty(false);
      setNotice('Documento guardado. Ya está disponible para todo el equipo.');
      onSaved();
    } catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }

  async function download() {
    setPending(true);
    setError('');
    try {
      const blob = await exportDocuments(projectId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `documentacion-${projectId}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }

  const selected = documents.find((doc) => doc.id === selectedId);
  return (
    <GlassCard className="documentation-panel" hover={false}>
      <div className="section-heading"><div><h2>Documentación del proyecto</h2><p className="muted-text">Notas compartidas en Markdown. Guarda tus cambios antes de exportar.</p></div>
        <button className="secondary-button" onClick={download} disabled={!projectId || pending || dirty || state !== 'ready'}><Download size={15} aria-hidden="true" />Exportar todo en .md</button>
      </div>
      {!projects.length ? <p className="muted-text">Crea un proyecto para comenzar la documentación.</p> : <>
        <div className="ticket-form document-selectors">
          <label>Proyecto activo<select value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={dirty || pending}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label>Documento<select value={selectedId} onChange={(event) => selectDocument(event.target.value)} disabled={dirty || pending || state !== 'ready'}><option value="">Nuevo documento</option>{documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.title}</option>)}</select></label>
          <button className="secondary-button" onClick={() => selectDocument('')} disabled={dirty || pending || state !== 'ready'}>Nuevo documento</button>
          <button className="secondary-button" onClick={() => setReloadKey((value) => value + 1)} disabled={pending}>{dirty ? 'Descartar cambios y recargar' : 'Recargar documentos'}</button>
        </div>
        {state === 'loading' && <p role="status">Cargando documentos...</p>}
        {state === 'ready' && <form className="ticket-form" onSubmit={save}>
          <label>Título<input required maxLength={200} value={form.title} disabled={pending} onChange={(event) => edit('title', event.target.value)} placeholder="Ej. Arquitectura y decisiones técnicas" /></label>
          <label>Contenido Markdown<textarea className="markdown-editor" value={form.content} disabled={pending} maxLength={200000} rows={16} onChange={(event) => edit('content', event.target.value)} placeholder={'# Documentación técnica\n\n## Arquitectura\n- Decisiones y acuerdos del equipo'} /></label>
          <div className="section-heading"><span className="muted-text">{dirty ? 'Cambios sin guardar' : selected ? `Última edición: ${selected.author.name} · ${new Date(selected.updatedAt).toLocaleString('es-MX')}` : 'Nuevo documento compartido'}</span><button className="primary-button" disabled={pending || !dirty}><Save size={15} aria-hidden="true" />{pending ? 'Procesando...' : 'Guardar documento'}</button></div>
        </form>}
      </>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="success-text" role="status">{notice}</p>}
    </GlassCard>
  );
}
