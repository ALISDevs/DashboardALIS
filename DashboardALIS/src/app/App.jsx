import React, { useEffect, useState } from 'react';
import { ClientProgressList } from '../features/progress/components/ClientProgressList.jsx';
import { getClientDashboard, postClientFeedback, acceptClientTerms } from '../shared/api/tickets.js';
import { TermsModal } from '../features/privacy/TermsModal.jsx';
import { Topbar } from '../shared/ui/Topbar.jsx';
import { GlassCard } from '../shared/ui/GlassCard.jsx';
import { Flag, LayoutGrid, LoaderCircle, LockKeyhole, MessageSquare, ShieldCheck } from 'lucide-react';

function getClientToken() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  return segments[0] === 'dashboard' && segments[1] ? segments[1] : '';
}

export default function App() {
  const clientToken = getClientToken();
  const [tickets, setTickets] = useState([]);
  const [project, setProject] = useState(null);
  const [state, setState] = useState('loading');
  const [terms, setTerms] = useState(null);
  const [view, setView] = useState('overview');

  function applyDashboard(data) {
    if (data.requiresTerms) {
      setProject(null);
      setTickets([]);
      setTerms(data.terms);
      setState('terms');
    } else {
      setTerms(null);
      setProject(data.project);
      setTickets(data.tickets);
      setState('ready');
    }
  }

  useEffect(() => {
    if (!clientToken) {
      setState('missing');
      return;
    }

    getClientDashboard(clientToken)
      .then(applyDashboard)
      .catch(() => setState('error'));
  }, [clientToken]);

  async function handleFeedback(ticketId, body, clientId) {
    await postClientFeedback(ticketId, {
      body,
      clientToken,
      isMilestoneFeedback: true
    });

    const refreshedDashboard = await getClientDashboard(clientToken);
    applyDashboard(refreshedDashboard);
  }

  async function handleAccept(version) {
    await acceptClientTerms(clientToken, version);
    applyDashboard(await getClientDashboard(clientToken));
  }

  if (state === 'terms') return <TermsModal terms={terms} onAccept={handleAccept} />;
  const navItems = [{ id: 'overview', label: 'Vista general', icon: LayoutGrid }, { id: 'milestones', label: 'Hitos del proyecto', icon: Flag }, { id: 'comments', label: 'Comentarios', icon: MessageSquare }];

  return (
    <>
    <Topbar items={state === 'ready' ? navItems : []} active={view} onSelect={setView} user={project?.client} caption="Client portal" />
    <main className="application-shell">
      <header className="page-heading">
        <div><p className="eyebrow">TU PROYECTO / {project?.client.company || 'ESPACIO DEL CLIENTE'}</p><h1>{project?.name || 'Todo gran avance empieza aquí.'}</h1><p className="heading-description">{project ? `Hola, ${project.client.name.split(' ')[0]}. Así estamos dando forma a tu próximo gran paso.` : 'Un espacio para seguir cada entrega y conversar con tu equipo.'}</p></div>
        <span className="private-access"><LockKeyhole size={14} aria-hidden="true" />Acceso privado</span>
      </header>
      {state === 'loading' && <p className="state-message" role="status"><LoaderCircle size={18} className="loading-icon" aria-hidden="true" />Preparando los avances de tu proyecto...</p>}
      {state === 'missing' && <GlassCard className="empty-state" hover={false}><LockKeyhole size={26} aria-hidden="true" /><h2>Tu proyecto tiene su propio espacio.</h2><p>Abre el enlace de acceso que te compartió el equipo ALIS.</p></GlassCard>}
      {state === 'error' && <GlassCard className="empty-state" hover={false}><Flag size={26} aria-hidden="true" /><h2>No pudimos cargar tus avances.</h2><p>Comprueba tu conexión e intenta recargar la página.</p></GlassCard>}
      {state === 'ready' && (
        <ClientProgressList
          tickets={tickets}
          clientId={project.client.id}
          onSubmitFeedback={handleFeedback}
          view={view}
          onViewChange={setView}
        />
      )}
      <footer className="workspace-footer"><span>ALIS · Construimos contigo.</span><span><ShieldCheck size={13} aria-hidden="true" />Tu proyecto. Tu espacio.</span></footer>
    </main>
    </>
  );
}
