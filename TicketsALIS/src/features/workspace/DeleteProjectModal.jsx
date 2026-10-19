import React, { useState } from 'react';

export function DeleteProjectModal({ project, onClose, onDelete }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    setPending(true);
    setError('');
    try { await onDelete(project.id); onClose(); }
    catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }

  return (
    <div className="modal-backdrop">
      <section className="ticket-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-project-title" aria-describedby="delete-project-description">
        <p className="modal-kicker">ELIMINAR PROYECTO</p>
        <h2 id="delete-project-title">¿Eliminar {project.name}?</h2>
        <p id="delete-project-description">Esta acción es irreversible. Se eliminarán el proyecto, sus tickets, comentarios, documentos y actividad. El enlace del cliente dejará de funcionar.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <footer className="modal-actions"><button type="button" autoFocus className="secondary-button" disabled={pending} onClick={onClose}>Cancelar</button><button type="button" className="danger-button" disabled={pending} onClick={confirm}>{pending ? 'Eliminando...' : 'Eliminar proyecto definitivamente'}</button></footer>
      </section>
    </div>
  );
}
