import React, { useState } from 'react';

const initialForm = {
  clientName: '',
  clientEmail: '',
  company: '',
  projectName: '',
  description: '',
  initialTitles: '',
  assignedToId: '',
  initialVisible: false
};

const projectDescriptionTemplate = `# Resumen del Proyecto
Desarrollo de plataforma web a medida para la gestión de operaciones internas.

## Alcance Inicial
- [ ] Módulo de autenticación y roles de usuario.
- [ ] Panel de administración con métricas clave.
- [ ] Integración de pasarela de pagos.

## Observaciones
Entregas parciales cada dos semanas para revisión del cliente.`;

export function NewProjectModal({ isOpen, users = [], onClose, onCreate }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  function updateField(event) {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await onCreate(form);
      setForm(initialForm);
      onClose();
    } catch (submissionError) {
      if (submissionError instanceof TypeError) {
        setError('No fue posible conectar con la API. Verifica que el backend esté activo en http://localhost:4000.');
      } else {
        setError(submissionError.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="ticket-modal project-modal" aria-modal="true" aria-labelledby="new-project-title" role="dialog">
        <header className="modal-header">
          <div>
            <p className="modal-kicker">NUEVO ESPACIO</p>
            <h2 id="new-project-title">Crear proyecto</h2>
          </div>
          <button type="button" className="icon-button" disabled={isSubmitting} onClick={onClose}>Cerrar</button>
        </header>
        <form className="ticket-form" onSubmit={handleSubmit}>
          <div className="form-section-title">Cliente</div>
          <div className="form-grid">
            <label>
              Nombre de contacto
              <input
                name="clientName"
                value={form.clientName}
                onChange={updateField}
                placeholder="Ej. Juan Pérez o Empresa Demo S.A."
                required
              />
            </label>
            <label>
              Correo electrónico
              <input
                name="clientEmail"
                type="email"
                value={form.clientEmail}
                onChange={updateField}
                placeholder="Ej. contacto@empresademo.com"
                required
              />
            </label>
          </div>
          <label>
            Empresa
            <input name="company" value={form.company} onChange={updateField} required />
          </label>
          <div className="form-section-title">Proyecto</div>
          <label>
            Nombre del proyecto
            <input
              name="projectName"
              value={form.projectName}
              onChange={updateField}
              placeholder="Ej. Plataforma E-commerce V2"
              required
            />
          </label>
          <div className="description-field">
            <div className="description-label">
              <label htmlFor="project-description">Descripción del proyecto</label>
              <button
                type="button"
                className="template-button"
                onClick={() => setForm((currentForm) => ({ ...currentForm, description: projectDescriptionTemplate }))}
              >
                Cargar ejemplo
              </button>
            </div>
            <textarea
              id="project-description"
              name="description"
              value={form.description}
              onChange={updateField}
              placeholder={'Ej. # Resumen del Proyecto\n- Módulo de autenticación\n- Panel de métricas'}
              rows="8"
            />
            <aside className="markdown-guide">
              <strong>Guía Markdown</strong>
              <p>Usa <code>#</code> y <code>##</code> para secciones, y listas con <code>-</code> o <code>- [ ]</code> para requisitos iniciales.</p>
            </aside>
          </div>
          <fieldset className="initial-tickets">
            <legend>Tickets iniciales (opcional)</legend>
            <label>Títulos, uno por línea<textarea name="initialTitles" value={form.initialTitles} onChange={updateField} rows="3" placeholder={'Definir requerimientos\nPreparar diseño de interfaces\nImplementar primera entrega'} /></label>
            <label>Responsable inicial<select name="assignedToId" value={form.assignedToId} onChange={updateField}><option value="">Sin asignar</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <label className="checkbox-label"><input name="initialVisible" type="checkbox" checked={form.initialVisible} onChange={updateField} />Publicar estos tickets en el portal del cliente</label>
          </fieldset>
          {error && <p className="form-error">{error}</p>}
          <footer className="modal-actions">
            <button type="button" className="secondary-button" disabled={isSubmitting} onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear proyecto'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
