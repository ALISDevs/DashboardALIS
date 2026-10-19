import React, { useEffect, useState } from 'react';

const initialForm = {
  title: '',
  description: '',
  category: '',
  priority: 'MEDIUM',
  projectId: '',
  assignedToId: '',
  isVisibleToClient: false
};

export function NewTicketModal({ isOpen, projects, users, onClose, onCreate }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...initialForm,
        projectId: projects[0]?.id || '',
        assignedToId: ''
      });
      setError('');
    }
  }, [isOpen, projects, users]);

  const availableUsers = projects.find((project) => project.id === form.projectId)?.members?.map((member) => member.user) || [];
  if (!isOpen) {
    return null;
  }

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'projectId' ? { assignedToId: '' } : {})
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await onCreate(form);
      onClose();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="ticket-modal" aria-modal="true" aria-labelledby="new-ticket-title" role="dialog">
        <header className="modal-header">
          <div>
            <p className="modal-kicker">NUEVA ENTREGA</p>
            <h2 id="new-ticket-title">Crear ticket</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar formulario">Cerrar</button>
        </header>
        {projects.length === 0 ? (
          <p>No hay proyectos disponibles para crear un ticket.</p>
        ) : (
          <form className="ticket-form" onSubmit={handleSubmit}>
            <label>
              Título
              <input name="title" value={form.title} onChange={updateField} required />
            </label>
            <label>
              Descripción
              <textarea name="description" value={form.description} onChange={updateField} rows="3" />
            </label>
            <div className="form-grid">
              <label>
                Prioridad
                <select name="priority" value={form.priority} onChange={updateField}>
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </label>
              <label>
                Categoría
                <input name="category" value={form.category} onChange={updateField} />
              </label>
              <label>
                Proyecto
                <select name="projectId" value={form.projectId} onChange={updateField} required>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
              <label>
                Asignado a
                <select name="assignedToId" value={form.assignedToId} onChange={updateField}>
                  <option value="">Sin asignar</option>
                  {availableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
            </div>
            <label className="checkbox-label">
              <input name="isVisibleToClient" type="checkbox" checked={form.isVisibleToClient} onChange={updateField} />
              Visible para el cliente
            </label>
            {error && <p className="form-error">{error}</p>}
            <footer className="modal-actions">
              <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Creando...' : 'Crear ticket'}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
