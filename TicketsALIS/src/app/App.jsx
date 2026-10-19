import React, { useCallback, useEffect, useRef, useState } from 'react';
import { InternalTicketBoard } from '../features/tickets/components/InternalTicketBoard.jsx';
import { NewTicketModal } from '../features/tickets/components/NewTicketModal.jsx';
import { NewProjectModal } from '../features/tickets/components/NewProjectModal.jsx';
import { TicketDetailModal } from '../features/tickets/components/TicketDetailModal.jsx';
import { Login } from '../features/workspace/Login.jsx';
import { ProjectOverview } from '../features/workspace/ProjectOverview.jsx';
import { ActivityFeed } from '../features/workspace/ActivityFeed.jsx';
import { Documentation } from '../features/workspace/Documentation.jsx';
import { TeamPanel } from '../features/workspace/TeamPanel.jsx';
import { DeleteProjectModal } from '../features/workspace/DeleteProjectModal.jsx';
import { ProjectMembersModal } from '../features/workspace/ProjectMembersModal.jsx';
import { WorkspaceSummary } from '../features/workspace/WorkspaceSummary.jsx';
import { Topbar } from '../shared/ui/Topbar.jsx';
import { Activity, CalendarDays, CircleCheck, FileText, FolderKanban, LayoutGrid, ListTodo, LoaderCircle, Plus, Search, ShieldCheck, Users } from 'lucide-react';
import {
  createProject, deleteProject, createTicket, getInternalTickets, getProjects, getUsers,
  updateTicketStatus, assignTicket, getActivity, getProfile, logout
} from '../shared/api/tickets.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(true);
  const [notice, setNotice] = useState('');
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tab, setTab] = useState('mine');
  const [projectId, setProjectId] = useState('');
  const [search, setSearch] = useState('');
  const [state, setState] = useState('loading');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [deletingProject, setDeletingProject] = useState(null);
  const [managingProjectId, setManagingProjectId] = useState('');
  const [updatingTicketId, setUpdatingTicketId] = useState('');
  const [actionError, setActionError] = useState('');
  const isAdmin = user?.role === 'ADMIN';
  const mineOnly = !isAdmin || tab === 'mine';
  const scopeRef = useRef(null);
  const refreshIdRef = useRef(0);
  scopeRef.current = { userId: user?.id, mineOnly };

  function acceptUser(profile) {
    setUser(profile);
    setTab(profile.role === 'ADMIN' ? 'projects' : 'mine');
    setState('loading');
    setActionError('');
    setNotice('');
  }

  useEffect(() => {
    let active = true;
      getProfile().then((profile) => { if (active) acceptUser(profile); })
        .catch((error) => { if (active && error.status !== 401) setNotice(error.message); })
        .finally(() => { if (active) setRestoring(false); });
    function expire() {
      setUser(null);
      setTickets([]);
      setProjects([]);
      setUsers([]);
      setActivities([]);
      setProjectId('');
      setIsModalOpen(false);
      setIsProjectModalOpen(false);
      setSelectedTicketId('');
      setDeletingProject(null);
      setManagingProjectId('');
      setNotice('La sesión terminó. Inicia sesión para continuar.');
    }
    window.addEventListener('alis-session-expired', expire);
    return () => { active = false; window.removeEventListener('alis-session-expired', expire); };
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const refreshId = ++refreshIdRef.current;
    const [ticketData, projectData, userData, activityData] = await Promise.all([
      getInternalTickets(mineOnly), getProjects(), getUsers(), getActivity()
    ]);
    if (refreshId !== refreshIdRef.current || scopeRef.current.userId !== user.id || scopeRef.current.mineOnly !== mineOnly) return;
    setTickets(ticketData);
    setProjects(projectData);
    setUsers(userData);
    setActivities(activityData);
    setState('ready');
  }, [user, mineOnly]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    refresh().catch((error) => { if (active) { setActionError(error.message); setState((current) => current === 'ready' ? current : 'error'); } });
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh().catch((error) => { if (active) setActionError(error.message); });
    }, 20000);
    return () => { active = false; clearInterval(timer); };
  }, [refresh, user]);

  function refreshAfterAction() {
    refresh().catch((error) => setActionError(`Los cambios se guardaron, pero no se pudo actualizar la vista: ${error.message}`));
  }

  async function handleCreateTicket(ticket) {
    const created = await createTicket(ticket);
    setTickets((current) => [created, ...current]);
    refreshAfterAction();
  }

  async function handleCreateProject(form) {
    const project = await createProject({
      name: form.projectName, description: form.description,
      client: { name: form.clientName, email: form.clientEmail, company: form.company },
      initialTickets: form.initialTitles.split('\n').map((title) => title.trim()).filter(Boolean)
        .map((title) => ({ title, assignedToId: form.assignedToId || null, isVisibleToClient: form.initialVisible }))
    });
    setProjects((current) => [project, ...current]);
    setTab('projects');
    refreshAfterAction();
  }

  async function handleDeleteProject(id) {
    await deleteProject(id);
    setProjects((current) => current.filter((project) => project.id !== id));
    setTickets((current) => current.filter((ticket) => ticket.projectId !== id));
    setActivities((current) => current.filter((activity) => activity.projectId !== id));
    if (projectId === id) setProjectId('');
    setSelectedTicketId('');
    refreshAfterAction();
  }

  async function handleStatusChange(id, status) {
    setUpdatingTicketId(id);
    setActionError('');
    try {
      const saved = await updateTicketStatus(id, status);
      setTickets((current) => current.map((ticket) => ticket.id === id ? saved : ticket));
      refreshAfterAction();
    } catch (error) { setActionError(error.message); }
    finally { setUpdatingTicketId(''); }
  }

  async function handleAssign(id, assignedToId) {
    const saved = await assignTicket(id, assignedToId);
    setTickets((current) => current.map((ticket) => ticket.id === id ? saved : ticket));
    refreshAfterAction();
  }

  async function handleLogout() {
    try { await logout(); window.dispatchEvent(new Event('alis-session-expired')); }
    catch (error) { setActionError(error.message); }
  }

  if (restoring) return <main className="login-shell"><p className="state-message" role="status"><LoaderCircle size={20} className="loading-icon" aria-hidden="true" />Restaurando sesión...</p></main>;
  if (!user) return <Login onLogin={acceptUser} notice={notice} />;

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId);
  const visibleTickets = tickets.filter((ticket) =>
    (!projectId || ticket.projectId === projectId) &&
    (tab !== 'mine' || ticket.assignedUserId === user.id) &&
    `${ticket.title} ${ticket.category || ''} ${ticket.project.name}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))
  );
  const ownProjectIds = new Set(tickets.filter((ticket) => ticket.assignedUserId === user.id).map((ticket) => ticket.projectId));
  const myProjects = isAdmin ? projects.filter((project) => ownProjectIds.has(project.id)) : projects;
  const managedProject = projects.find((project) => project.id === managingProjectId);
  const ticketProject = projects.find((project) => project.id === selectedTicket?.projectId);
  const navItems = [
    ...(isAdmin ? [{ id: 'projects', label: 'Proyectos', icon: LayoutGrid }, { id: 'tasks', label: 'Tickets', icon: FolderKanban }] : []),
    { id: 'mine', label: 'Mis tareas', icon: ListTodo },
    { id: 'docs', label: 'Documentación', icon: FileText },
    { id: 'activity', label: 'Actividad', icon: Activity },
    ...(isAdmin ? [{ id: 'team', label: 'Equipo', icon: Users }] : [])
  ];
  const title = { projects: 'Todo empieza con un gran proyecto.', tasks: 'Cada entrega, bajo control.', mine: `Hola, ${user.name.split(' ')[0]}.`, docs: 'El conocimiento, compartido.', activity: 'Así avanza tu equipo.', team: 'Un equipo. Un mismo objetivo.' }[tab];
  const subtitle = tab === 'mine' ? 'Tu foco de hoy. Un paso más cerca de la próxima entrega.' : 'Proyectos, personas y progreso. Todo en un mismo lugar.';

  return (
    <>
    <Topbar items={navItems} active={tab} onSelect={(id) => { setTab(id); setSearch(''); setActionError(''); }} user={user} onLogout={handleLogout} caption="Workspace" />
    <main className="application-shell">
      <header className="page-heading">
        <div><p className="eyebrow">TU ESPACIO / {isAdmin ? 'ADMINISTRACIÓN' : 'EQUIPO ALIS'}</p><h1>{title}</h1><p className="heading-description">{subtitle}</p></div>
        <div className="header-actions">{isAdmin ? <><button className="secondary-button" onClick={() => setIsModalOpen(true)}><Plus size={16} aria-hidden="true" />Crear ticket</button><button className="primary-button" onClick={() => setIsProjectModalOpen(true)}><Plus size={16} aria-hidden="true" />Nuevo proyecto</button></> : <span className="date-chip"><CalendarDays size={15} aria-hidden="true" />{new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}</span>}</div>
      </header>
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      {state === 'loading' && <p className="state-message" role="status"><LoaderCircle size={18} className="loading-icon" aria-hidden="true" />Cargando espacio de trabajo...</p>}
      {state === 'error' && <button className="secondary-button" onClick={() => refresh().catch((error) => setActionError(error.message))}>Reintentar conexión</button>}
      {state === 'ready' && <>
        {['projects', 'tasks', 'mine'].includes(tab) && <WorkspaceSummary projects={tab === 'mine' ? myProjects : projects} tickets={tickets} personal={tab === 'mine'} />}
        {tab === 'projects' && isAdmin && <><div className="section-heading"><div><h2>Proyectos de clientes <span className="section-count">{projects.length}</span></h2><p className="section-subtitle">Una vista clara de cada compromiso.</p></div><span className="subtle-label"><CircleCheck size={14} aria-hidden="true" />Progreso de hitos públicos</span></div><ProjectOverview projects={projects} selectedId={projectId} onSelect={(id) => { setProjectId(id); setTab('tasks'); }} isAdmin onDelete={setDeletingProject} onManageMembers={setManagingProjectId} /></>}
        {(tab === 'tasks' || tab === 'mine') && <>
          {tab === 'mine' && <><h2>Progreso de tus proyectos</h2><ProjectOverview projects={myProjects} selectedId={projectId} onSelect={setProjectId} /></>}
          <div className="section-heading task-heading"><h2>{tab === 'mine' ? 'Mis tareas' : 'Tablero del equipo'} <span className="section-count">{visibleTickets.length}</span></h2><div className="board-filters"><label className="search-field"><Search size={15} aria-hidden="true" /><span className="sr-only">Buscar tickets</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar una tarea..." /></label><label className="status-control filter-control"><span className="sr-only">Proyecto</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Todos los proyectos</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label></div></div>
          {!visibleTickets.length && <p className="muted-text">{tab === 'mine' ? 'No tienes tareas asignadas en esta vista.' : 'No hay tickets en este proyecto.'}</p>}
          <InternalTicketBoard tickets={visibleTickets} onStatusChange={handleStatusChange} onOpenTicket={setSelectedTicketId} updatingTicketId={updatingTicketId} />
          {tab === 'mine' && <ActivityFeed activities={activities.filter((activity) => activity.userId !== user.id && (!projectId || activity.projectId === projectId)).slice(0, 10)} userId={user.id} />}
        </>}
        <div hidden={tab !== 'docs'}><Documentation projects={projects} onSaved={refreshAfterAction} /></div>
        {tab === 'activity' && <ActivityFeed activities={activities} userId={user.id} />}
        {tab === 'team' && isAdmin && <TeamPanel users={users} onCreated={(member) => setUsers((current) => [...current, member])} />}
      </>}
      <footer className="workspace-footer"><span>ALIS Workspace · Diseñado para avanzar.</span><span><ShieldCheck size={13} aria-hidden="true" />Tu espacio de equipo</span></footer>
      {isAdmin && <><NewTicketModal isOpen={isModalOpen} projects={projects} users={users} onClose={() => setIsModalOpen(false)} onCreate={handleCreateTicket} /><NewProjectModal isOpen={isProjectModalOpen} users={users} onClose={() => setIsProjectModalOpen(false)} onCreate={handleCreateProject} />{deletingProject && <DeleteProjectModal project={deletingProject} onClose={() => setDeletingProject(null)} onDelete={handleDeleteProject} />}</>}
      {isAdmin && managedProject && <ProjectMembersModal project={managedProject} users={users} currentUserId={user.id} onChanged={refresh} onClose={() => setManagingProjectId('')} />}
      <TicketDetailModal key={selectedTicketId} ticket={selectedTicket} isAdmin={isAdmin} users={ticketProject?.members.map((member) => member.user) || []} onAssign={handleAssign} onClose={() => setSelectedTicketId('')} />
    </main>
    </>
  );
}
