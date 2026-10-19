import React, { useState } from 'react';
import { login } from '../../shared/api/tickets.js';
import { GlassCard } from '../../shared/ui/GlassCard.jsx';
import { Brand } from '../../shared/ui/Brand.jsx';
import { ArrowRight, LockKeyhole } from 'lucide-react';

export function Login({ onLogin, notice }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try { onLogin(await login({ identifier, password })); }
    catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }

  return (
    <main className="login-shell">
      <GlassCard className="login-card" hover={false}>
        <Brand />
        <p className="eyebrow">BIENVENIDO A TU ESPACIO</p>
        <h1>Tu espacio de trabajo</h1>
        <p className="heading-description">Organiza las entregas y construye con tu equipo.</p>
        <form className="ticket-form" onSubmit={submit}>
          <label>Usuario o correo<input type="text" name="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required placeholder="Ej. ALIS o Ness_ALIS" /></label>
          <label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required maxLength={128} /></label>
          {(error || notice) && <p className="form-error" role="alert">{error || notice}</p>}
          <button className="primary-button" disabled={pending}>{pending ? 'Ingresando...' : 'Iniciar sesión'}<ArrowRight size={16} aria-hidden="true" /></button>
        </form>
        <p className="muted-text"><LockKeyhole size={12} aria-hidden="true" /> Un espacio privado, conectado a tu equipo.</p>
      </GlassCard>
    </main>
  );
}
