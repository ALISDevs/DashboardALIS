import React, { useState } from 'react';
import { createUser } from '../../shared/api/tickets.js';

export function TeamPanel({ users, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    setMessage('');
    try {
      const user = await createUser(form);
      onCreated(user);
      setForm({ name: '', email: '', username: '', password: '' });
      setMessage('Miembro registrado. Ya puede iniciar sesión con sus credenciales.');
    } catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }
  return (
    <section className="team-layout">
      <div className="workspace-panel"><h2>Equipo ALIS</h2>{users.map((user) => <p key={user.id}>{user.name} <span className="muted-text">· {user.email} · {user.role === 'ADMIN' ? 'Administrador' : 'Miembro'}</span></p>)}</div>
      <div className="workspace-panel"><h2>Registrar miembro</h2><form className="ticket-form" onSubmit={submit}>
        <label>Nombre<input required maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Correo<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Usuario de acceso (opcional)<input value={form.username} autoComplete="off" pattern="[A-Za-z0-9_]{3,32}" minLength={3} maxLength={32} placeholder="Ej. Ana_ALIS" onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
        <label>Contraseña<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><span className="muted-text">Mínimo 12 caracteres.</span></label>
        {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="success-text" role="status">{message}</p>}
        <button className="primary-button" disabled={pending}>{pending ? 'Registrando...' : 'Registrar miembro'}</button>
      </form></div>
    </section>
  );
}
