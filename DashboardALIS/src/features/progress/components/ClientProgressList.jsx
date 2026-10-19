import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, CheckCheck, ChevronDown, CircleCheck, CircleDot, Clock3, Flag, Inbox, Layers2, MessageSquare, Send } from 'lucide-react';
import { GlassCard } from '../../../shared/ui/GlassCard.jsx';
import { StatsCard } from '../../../shared/ui/StatsCard.jsx';

const statusLabel = { NEW: 'Planificado', IN_PROGRESS: 'En progreso', RESOLVED: 'Finalizado' };
const statusIcon = { NEW: Clock3, IN_PROGRESS: CircleDot, RESOLVED: CircleCheck };

export function ClientProgressList({ tickets, clientId, onSubmitFeedback, view = 'overview', onViewChange }) {
  const [expandedTicketId, setExpandedTicketId] = useState('');
  const [feedbackByTicket, setFeedbackByTicket] = useState({});
  const [feedbackState, setFeedbackState] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const reducedMotion = useReducedMotion();
  const completedTickets = tickets.filter((ticket) => ticket.status === 'RESOLVED');
  const inProgress = tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length;
  const progress = tickets.length === 0 ? 0 : Math.floor(completedTickets.length / tickets.length * 100);
  const visibleTickets = view === 'comments' || statusFilter === 'all' ? tickets : tickets.filter((ticket) => ticket.status === statusFilter);

  async function handleFeedbackSubmit(event, ticket) {
    event.preventDefault();
    const body = feedbackByTicket[ticket.id]?.trim();
    if (!body) return;
    setFeedbackState((current) => ({ ...current, [ticket.id]: 'submitting' }));
    try {
      await onSubmitFeedback(ticket.id, body, clientId);
      setFeedbackByTicket((current) => ({ ...current, [ticket.id]: '' }));
      setFeedbackState((current) => ({ ...current, [ticket.id]: 'success' }));
    } catch {
      setFeedbackState((current) => ({ ...current, [ticket.id]: 'error' }));
    }
  }

  return (
    <section className="dashboard-content" aria-label="Progreso del proyecto">
      {view === 'overview' && <div className="client-summary-grid">
        <GlassCard className="feature-card progress-overview">
          <div className="feature-art" aria-hidden="true" />
          <div className="feature-kicker"><Layers2 size={15} aria-hidden="true" />TU PROYECTO, CADA VEZ MÁS CERCA</div>
          <div className="hero-progress-number"><strong>{progress}<span>%</span></strong><p>del camino<br />completado</p></div>
          <div className="hero-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Progreso general del proyecto"><motion.span initial={false} animate={{ width: `${progress}%` }} transition={{ duration: reducedMotion ? 0 : 0.7 }} /></div>
          <div className="feature-footer"><span>{completedTickets.length} de {tickets.length} hitos completados</span><span className="feature-pill"><span className="feature-status-dot" />{tickets.length === 0 ? 'Próximamente' : progress === 100 ? 'Proyecto completado' : 'En movimiento'}</span></div>
        </GlassCard>
        <StatsCard label="Hitos finalizados" value={completedTickets.length.toString().padStart(2, '0')} caption="Entregas listas para ti" icon={CircleCheck} tone="tone-green" delay={0.04} />
        <StatsCard label="En desarrollo" value={inProgress.toString().padStart(2, '0')} caption="Lo que estamos construyendo" icon={CircleDot} tone="tone-orange" delay={0.08} />
      </div>}

      <div className={`client-bento ${view !== 'overview' ? 'client-bento-full' : ''}`}>
        <section className="milestones-main" aria-label={view === 'comments' ? 'Comentarios de los hitos' : 'Hitos publicados'}>
          <div className="section-heading"><div><h2>{view === 'comments' ? 'Una conversación por cada entrega.' : 'El avance, en detalle.'}<span className="section-count">{tickets.length}</span></h2><p className="section-subtitle">{view === 'comments' ? 'Comparte tus ideas directamente con el equipo.' : 'Sigue los hitos que dan forma a tu proyecto.'}</p></div><Flag size={17} className="muted-icon" aria-hidden="true" /></div>
          {view !== 'comments' && <div className="milestone-filters" aria-label="Filtrar hitos por estado">{[['all', 'Todos'], ['IN_PROGRESS', 'En progreso'], ['RESOLVED', 'Finalizados'], ['NEW', 'Planificados']].map(([id, label]) => <button key={id} type="button" aria-pressed={statusFilter === id} className={statusFilter === id ? 'is-active' : ''} onClick={() => setStatusFilter(id)}>{label}</button>)}</div>}
          <div className={`progress-list ${view !== 'overview' ? 'progress-list-grid' : ''}`}>
            {visibleTickets.map((ticket) => {
              const isExpanded = expandedTicketId === ticket.id || view === 'comments';
              const state = feedbackState[ticket.id];
              const StatusIcon = statusIcon[ticket.status];
              return (
                <GlassCard className={`progress-item milestone-${ticket.status.toLowerCase()}`} key={ticket.id} role="article">
                  <div className="progress-item-header"><span className="milestone-icon"><StatusIcon size={20} aria-hidden="true" /></span><span className={`status-badge status-${ticket.status.toLowerCase()}`}><StatusIcon size={11} aria-hidden="true" />{statusLabel[ticket.status]}</span></div>
                  <p className="milestone-category">{ticket.category || 'Hito del proyecto'}</p>
                  <h3>{ticket.title}</h3>
                  {ticket.description && <p className="milestone-description">{ticket.description}</p>}
                  <div className="milestone-meta"><span>{ticket.assignedUser?.name ? `Equipo · ${ticket.assignedUser.name}` : 'Equipo ALIS'}</span><span>{new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span></div>
                  {view !== 'comments' && <button className="feedback-toggle" type="button" aria-expanded={isExpanded} aria-controls={`ticket-feedback-${ticket.id}`} onClick={() => setExpandedTicketId(isExpanded ? '' : ticket.id)}><span><MessageSquare size={14} aria-hidden="true" />{ticket.comments.length} {ticket.comments.length === 1 ? 'comentario' : 'comentarios'}</span><span>{isExpanded ? 'Cerrar' : 'Conversar'}<ChevronDown size={14} className={isExpanded ? 'is-expanded' : ''} aria-hidden="true" /></span></button>}
                  <AnimatePresence initial={false}>{isExpanded && <motion.div id={`ticket-feedback-${ticket.id}`} className="ticket-feedback" initial={reducedMotion ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.22 }}>
                    <div className="comment-list">{ticket.comments.map((comment) => <article className="comment-card" key={comment.id}><span className="avatar">{(comment.client?.name || 'ALIS').slice(0, 2).toUpperCase()}</span><div><strong>{comment.client?.name || 'Equipo ALIS'}</strong><p>{comment.body}</p></div></article>)}{ticket.comments.length === 0 && <p className="no-comments">Todavía no hay comentarios. Tu opinión puede ser la primera.</p>}</div>
                    <form className="feedback-form" onSubmit={(event) => handleFeedbackSubmit(event, ticket)}><label htmlFor={`feedback-input-${ticket.id}`}>Tu feedback<textarea id={`feedback-input-${ticket.id}`} value={feedbackByTicket[ticket.id] || ''} onChange={(event) => setFeedbackByTicket((current) => ({ ...current, [ticket.id]: event.target.value }))} rows={3} maxLength={10000} required disabled={state === 'submitting'} placeholder="¿Qué te parece esta entrega?" /></label>
                      {state === 'error' && <p className="feedback-error" role="alert">No fue posible enviar el comentario. Intenta de nuevo.</p>}{state === 'success' && <p className="feedback-success" role="status">Tu comentario ya está con el equipo.</p>}
                      <button className="primary-button" type="submit" disabled={state === 'submitting'}><Send size={14} aria-hidden="true" />{state === 'submitting' ? 'Enviando...' : 'Enviar feedback'}</button>
                    </form>
                  </motion.div>}</AnimatePresence>
                </GlassCard>
              );
            })}
          </div>
          {!visibleTickets.length && <div className="empty-state"><Inbox size={25} aria-hidden="true" />{tickets.length ? 'No hay hitos con este estado.' : 'Tu próximo avance empieza aquí. Los hitos aparecerán cuando el equipo los publique.'}</div>}
        </section>
        {view === 'overview' && <aside className="client-sidebar" aria-label="Resumen de entregas y comunicación">
          <GlassCard className="milestone-section"><div className="section-heading"><h2>Entregas completadas</h2><CheckCheck size={19} className="completion-icon" aria-hidden="true" /></div><p className="section-subtitle">Lo que ya hicimos realidad.</p><div className="milestone-grid">{completedTickets.slice(0, 4).map((ticket) => <article className="milestone-card" key={ticket.id}><span className="completed-marker"><CircleCheck size={15} aria-hidden="true" /></span><div><h3>{ticket.title}</h3><p>{ticket.category || 'Entrega finalizada'}</p></div></article>)}{!completedTickets.length && <p className="no-comments">Cada gran proyecto comienza con un primer hito. Pronto verás tus entregas aquí.</p>}</div>{completedTickets.length > 4 && <button className="text-button" onClick={() => { setStatusFilter('RESOLVED'); onViewChange?.('milestones'); }}>Ver las {completedTickets.length} entregas<ArrowUpRight size={14} aria-hidden="true" /></button>}</GlassCard>
          <GlassCard className="conversation-card"><span className="conversation-icon"><MessageSquare size={23} aria-hidden="true" /></span><h2>Tu voz también<br />construye el proyecto.</h2><p>Ideas, preguntas o un detalle que quieras ajustar. Estamos del otro lado.</p><button className="secondary-button" type="button" onClick={() => onViewChange?.('comments')}>Compartir feedback<ArrowUpRight size={15} aria-hidden="true" /></button></GlassCard>
        </aside>}
      </div>
    </section>
  );
}
