import React, { useState } from 'react';
import { addProjectMember, removeProjectMember } from '../../shared/api/tickets.js';

export function ProjectMembersModal({ project, users, currentUserId, onChanged, onClose }) {
  const [userId, setUserId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const available = users.filter((user) => !project.members.some((member) => member.userId === user.id));
  async function change(operation) {
    setPending(true);
    setError('');
    try { await operation(); await onChanged(); setUserId(''); }
    catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }
  return <div className="modal-backdrop"><section className="ticket-modal" role="dialog" aria-modal="true" aria-labelledby="project-members-title">
    <header className="modal-header"><div><p className="modal-kicker">EQUIPO DEL PROYECTO</p><h2 id="project-members-title">{project.name}</h2></div><button className="secondary-button" disabled={pending} onClick={onClose}>Cerrar</button></header>
    <p className="muted-text">Solo los integrantes pueden consultar este proyecto y su documentación. Los administradores también necesitan pertenecer al proyecto.</p>
    <ul className="member-list">{project.members.map((member) => <li key={member.userId}><span>{member.user.name} · {member.user.role === 'ADMIN' ? 'Administrador' : 'Miembro'}</span>{member.userId !== currentUserId && member.userId !== project.createdById && <button className="danger-button" disabled={pending} onClick={() => change(() => removeProjectMember(project.id, member.userId))}>Retirar acceso</button>}</li>)}</ul>
    <form className="ticket-form" onSubmit={(event) => { event.preventDefault(); change(() => addProjectMember(project.id, userId)); }}><label>Añadir integrante<select required value={userId} disabled={pending} onChange={(event) => setUserId(event.target.value)}><option value="">Selecciona una persona</option>{available.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><button className="primary-button" disabled={pending || !available.length || !userId}>Dar acceso al proyecto</button></form>
    {error && <p className="form-error" role="alert">{error}</p>}
  </section></div>;
}
