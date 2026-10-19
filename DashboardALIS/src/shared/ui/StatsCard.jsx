import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { GlassCard } from './GlassCard.jsx';

export function StatsCard({ label, value, caption, icon: Icon, tone = '', delay = 0 }) {
  return (
    <GlassCard className={`stats-card ${tone}`} delay={delay}>
      <div className="stats-card-top"><span className="card-icon">{Icon && <Icon size={19} aria-hidden="true" />}</span><ArrowUpRight size={17} className="muted-icon" aria-hidden="true" /></div>
      <p className="stats-label">{label}</p>
      <strong className="stats-value">{value}</strong>
      <p className="stats-caption">{caption}</p>
    </GlassCard>
  );
}

