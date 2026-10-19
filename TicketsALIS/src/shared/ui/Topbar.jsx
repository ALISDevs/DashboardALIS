import React from 'react';
import { LogOut } from 'lucide-react';
import { Brand } from './Brand.jsx';

export function Topbar({ items = [], active, onSelect, user, onLogout, caption }) {
  const initials = (user?.name || 'ALIS').split(' ').filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  return (
    <header className="topbar">
      <Brand caption={caption} />
      <nav className="workspace-nav" aria-label="Navegación principal">
        {items.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={active === id ? 'is-active' : ''} aria-current={active === id ? 'page' : undefined} onClick={() => onSelect(id)}>{Icon && <Icon size={16} aria-hidden="true" />}<span>{label}</span></button>)}
      </nav>
      <div className="topbar-account"><span className="avatar">{initials}</span><div className="account-copy"><strong>{user?.name || 'Cliente ALIS'}</strong><span>{user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'MEMBER' ? 'Miembro del equipo' : 'Espacio de cliente'}</span></div>{onLogout && <button className="icon-button logout-button" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onLogout}><LogOut size={17} aria-hidden="true" /></button>}</div>
    </header>
  );
}

