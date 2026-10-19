import React from 'react';
import { Activity } from 'lucide-react';
import { GlassCard } from '../../shared/ui/GlassCard.jsx';

export function ActivityFeed({ activities, userId }) {
  return (
    <GlassCard className="activity-panel" hover={false} role="region" aria-label="Actividad del equipo">
      <h2><Activity size={17} className="muted-icon" aria-hidden="true" />Actividad del equipo</h2>
      {!activities.length && <p className="muted-text">Las próximas acciones del equipo aparecerán aquí.</p>}
      <ol className="activity-feed">
        {activities.map((activity) => (
          <li key={activity.id}>
            <span className="avatar" aria-hidden="true">{activity.user.name.slice(0, 2).toUpperCase()}</span>
            <div><strong>{activity.user.name}{activity.user.id === userId ? ' (tú)' : ''}</strong><p>{activity.summary}</p><span className="muted-text">{activity.project.name} · <time dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleString('es-MX')}</time></span></div>
          </li>
        ))}
      </ol>
    </GlassCard>
  );
}
