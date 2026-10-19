import React from 'react';
import { ArrowUpRight, Folder, Link2, Trash2, Users } from 'lucide-react';
import { GlassCard } from '../../shared/ui/GlassCard.jsx';

const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5174';

export function ProjectOverview({ projects, selectedId, onSelect, isAdmin, onDelete, onManageMembers }) {
  if (!projects.length) return <p className="muted-text">Aún no hay proyectos para mostrar.</p>;
  return (
    <section className="project-grid" aria-label="Progreso de proyectos">
      {projects.map((project) => (
        <GlassCard className={`project-summary ${selectedId === project.id ? 'is-selected' : ''}`} key={project.id}>
          <div className="section-heading"><span className="card-icon project-icon"><Folder size={18} aria-hidden="true" /></span><span className={`project-status ${project.progress.label === 'Finalizado' ? 'is-complete' : ''}`}>{project.progress.label}</span></div>
          <p className="project-client">{project.client.company}</p>
          <h2>{project.name}</h2>
          <div className="progress-heading"><span>Hitos públicos</span><strong>{project.progress.percent}%</strong></div>
          <progress value={project.progress.percent} max="100" aria-label={`Progreso de ${project.name}`} />
          <p className="muted-text">{project.progress.resolved} de {project.progress.total} hitos resueltos</p>
          <div className="project-card-actions">
            <button className="secondary-button" type="button" onClick={() => onSelect(project.id)}>Ver tareas<ArrowUpRight size={14} aria-hidden="true" /></button>
            {isAdmin && <button className="secondary-button" type="button" onClick={() => onManageMembers(project.id)}><Users size={14} aria-hidden="true" />Equipo del proyecto</button>}
          </div>
          {isAdmin && <div className="project-access"><span className="muted-text"><Link2 size={12} aria-hidden="true" />Portal del cliente</span><a href={`${dashboardUrl}/dashboard/${project.accessToken}`} target="_blank" rel="noreferrer">{`${dashboardUrl}/dashboard/${project.accessToken}`}</a><button type="button" className="danger-button" onClick={() => onDelete(project)}><Trash2 size={13} aria-hidden="true" />Eliminar Proyecto</button></div>}
        </GlassCard>
      ))}
    </section>
  );
}
