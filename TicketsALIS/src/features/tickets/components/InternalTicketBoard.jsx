import React from 'react';
import { ArrowUpRight, CheckCheck, Circle, CircleDot, Inbox, MessageSquare, Eye, LockKeyhole } from 'lucide-react';
import { GlassCard } from '../../../shared/ui/GlassCard.jsx';

const columnIcons = { NEW: Circle, IN_PROGRESS: CircleDot, RESOLVED: CheckCheck };

const columnByStatus = {
  NEW: 'Nuevos',
  IN_PROGRESS: 'En curso',
  RESOLVED: 'Resueltos'
};

const priorityLabel = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica'
};

function getInitials(name) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function InternalTicketBoard({ tickets, onStatusChange, onOpenTicket, updatingTicketId }) {
  return (
    <section className="ticket-board" aria-label="Tablero de tickets">
      {Object.entries(columnByStatus).map(([status, label]) => {
        const columnTickets = tickets.filter((ticket) => ticket.status === status);
        const ColumnIcon = columnIcons[status];

        return (
          <article className={`board-column column-${status.toLowerCase()}`} key={status}>
            <header>
              <h2><ColumnIcon size={15} aria-hidden="true" />{label}<span className="column-count">{columnTickets.length}</span></h2>
              <span className="column-marker" aria-hidden="true" />
            </header>
            <div className="ticket-stack">
              {columnTickets.map((ticket) => (
                <GlassCard className={`ticket-card priority-${ticket.priority.toLowerCase()}`} key={ticket.id}>
                  <header className="ticket-card-header">
                    <span className="ticket-category">{ticket.category || 'General'}</span>
                    <span className="ticket-priority"><span className="priority-dot" aria-hidden="true" />{priorityLabel[ticket.priority]}</span>
                  </header>
                  <h3>{ticket.title}</h3>
                  <p className="ticket-project">{ticket.project.name}</p>
                  <footer className="ticket-meta">
                    <div className="ticket-owner">
                      <span className="avatar">{ticket.assignedUser ? getInitials(ticket.assignedUser.name) : '—'}</span>
                      <span>{ticket.assignedUser?.name || 'Sin asignar'}</span>
                    </div>
                    <span className={ticket.isVisibleToClient ? 'visibility-badge is-visible' : 'visibility-badge'}>
                      {ticket.isVisibleToClient ? <Eye size={11} aria-hidden="true" /> : <LockKeyhole size={11} aria-hidden="true" />}
                      {ticket.isVisibleToClient ? 'Cliente' : 'Interno'}
                    </span>
                  </footer>
                  <button type="button" className="ticket-detail-trigger" onClick={() => onOpenTicket(ticket.id)}>
                    <span className="detail-label">Ver detalle<ArrowUpRight size={13} aria-hidden="true" /></span>
                    <span><MessageSquare size={12} aria-hidden="true" />{ticket.comments.length}</span>
                  </button>
                  <label className="status-control">
                    Estado
                    <select
                      value={ticket.status}
                      onChange={(event) => onStatusChange(ticket.id, event.target.value)}
                      disabled={updatingTicketId === ticket.id}
                    >
                      <option value="NEW">Nuevo</option>
                      <option value="IN_PROGRESS">En curso</option>
                      <option value="RESOLVED">Resuelto</option>
                    </select>
                  </label>
                </GlassCard>
              ))}
              {columnTickets.length === 0 && <div className="column-empty"><Inbox size={21} aria-hidden="true" /><p>Todo despejado por aquí.</p></div>}
            </div>
          </article>
        );
      })}
    </section>
  );
}
