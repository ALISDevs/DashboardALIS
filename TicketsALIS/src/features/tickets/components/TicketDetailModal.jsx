import React, { useState } from 'react';

export function TicketDetailModal({ ticket, onClose, isAdmin, users = [], onAssign }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (!ticket) {
    return null;
  }

  async function assign(value) {
    setPending(true);
    setError('');
    try { await onAssign(ticket.id, value); }
    catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="ticket-modal ticket-detail-modal" aria-modal="true" aria-labelledby="ticket-detail-title" role="dialog">
        <header className="modal-header">
          <div>
            <p className="modal-kicker">{ticket.project.name}</p>
            <h2 id="ticket-detail-title">{ticket.title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>Cerrar</button>
        </header>
        <p className="ticket-description">{ticket.description || 'Sin descripción adicional.'}</p>
        {isAdmin && <label className="status-control">Responsable<select value={ticket.assignedUserId || ''} disabled={pending} onChange={(event) => assign(event.target.value)}><option value="">Sin asignar</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <section className="ticket-comments" aria-label="Comentarios del ticket">
          <h3>Comentarios del cliente</h3>
          {ticket.comments.length === 0 && <p className="empty-comments">Aún no hay feedback registrado.</p>}
          {ticket.comments.map((comment) => (
            <article className="internal-comment" key={comment.id}>
              <strong>{comment.client?.name || comment.user?.name || 'Equipo ALIS'}</strong>
              <p>{comment.body}</p>
            </article>
          ))}
        </section>
      </section>
    </div>
  );
}
