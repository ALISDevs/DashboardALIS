import React from 'react';
import { ArrowUpRight, CircleCheck, CircleDot, Layers2 } from 'lucide-react';
import { GlassCard } from '../../shared/ui/GlassCard.jsx';
import { StatsCard } from '../../shared/ui/StatsCard.jsx';

export function WorkspaceSummary({ projects, tickets, personal }) {
  const total = projects.reduce((sum, project) => sum + project.progress.total, 0);
  const resolved = projects.reduce((sum, project) => sum + project.progress.resolved, 0);
  const progress = total ? Math.floor(resolved / total * 100) : 0;
  const activeTickets = tickets.filter((ticket) => ticket.status !== 'RESOLVED').length;
  const completedTickets = tickets.filter((ticket) => ticket.status === 'RESOLVED').length;
  return (
    <section className="workspace-summary" aria-label="Resumen del espacio de trabajo">
      <GlassCard className="feature-card summary-feature">
        <div className="feature-art" aria-hidden="true" />
        <span className="feature-kicker"><Layers2 size={15} aria-hidden="true" />{personal ? 'TUS PROYECTOS' : 'PANORAMA GENERAL'}</span>
        <h2 className="feature-title">Cada entrega cuenta.</h2>
        <p className="feature-subtitle">{resolved} de {total} hitos públicos completados.</p>
        <div className="feature-footer"><span className="feature-pill">{projects.length} {projects.length === 1 ? 'proyecto conectado' : 'proyectos conectados'}</span><strong>{progress}% <ArrowUpRight size={15} aria-hidden="true" /></strong></div>
      </GlassCard>
      <StatsCard label={personal ? 'Tus tareas pendientes' : 'Tickets pendientes'} value={activeTickets} caption="Planificadas y en curso" icon={CircleDot} tone="tone-orange" delay={0.04} />
      <StatsCard label={personal ? 'Tus tareas resueltas' : 'Tickets resueltos'} value={completedTickets} caption="Entregas que ya están listas" icon={CircleCheck} tone="tone-green" delay={0.08} />
    </section>
  );
}
