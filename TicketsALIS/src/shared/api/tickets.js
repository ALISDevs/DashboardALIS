const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export function clearSession() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem('alis-session');
    window.localStorage.removeItem('alis-session');
  } catch {}
}
clearSession();

async function request(path, { method = 'GET', body, download = false, silentUnauthorized = false } = {}) {
  let response;
  try {
    response = await fetch(`${apiUrl}/api${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(!['GET', 'HEAD'].includes(method) ? { 'X-ALIS-Request': '1' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch {
    throw new Error('No se pudo conectar con la API. Comprueba que el backend esté activo.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && !silentUnauthorized && path !== '/auth/login') {
      window.dispatchEvent(new Event('alis-session-expired'));
    }
    const error = new Error(payload.message || 'No fue posible completar la operación.');
    error.status = response.status;
    throw error;
  }
  if (download) return response.blob();
  if (response.status === 204) return null;
  return (await response.json()).data;
}

export async function login(credentials) {
  const { user } = await request('/auth/login', { method: 'POST', body: credentials });
  return user;
}

export const getProfile = () => request('/auth/me', { silentUnauthorized: true });
export async function logout() {
  try { await request('/auth/logout', { method: 'POST' }); }
  finally { clearSession(); }
}

export const getInternalTickets = (mine = false) => request(`/tickets${mine ? '?mine=true' : ''}`);
export const createTicket = (body) => request('/tickets', { method: 'POST', body });
export const updateTicketStatus = (id, status) => request(`/tickets/${id}/status`, { method: 'PATCH', body: { status } });
export const assignTicket = (id, assignedToId) => request(`/tickets/${id}/assignment`, { method: 'PATCH', body: { assignedToId: assignedToId || null } });
export const getProjects = () => request('/projects');
export const getUsers = () => request('/users');
export const createUser = (body) => request('/users', { method: 'POST', body });
export const createProject = (body) => request('/projects', { method: 'POST', body });
export const deleteProject = (id) => request(`/projects/${id}`, { method: 'DELETE' });
export const addProjectMember = (id, userId) => request(`/projects/${id}/members`, { method: 'POST', body: { userId } });
export const removeProjectMember = (id, userId) => request(`/projects/${id}/members/${userId}`, { method: 'DELETE' });
export const getActivity = () => request('/activity');
export const getDocuments = (projectId) => request(`/projects/${projectId}/documents`);
export const createDocument = (projectId, body) => request(`/projects/${projectId}/documents`, { method: 'POST', body });
export const updateDocument = (projectId, id, body) => request(`/projects/${projectId}/documents/${id}`, { method: 'PATCH', body });
export const exportDocuments = (projectId) => request(`/projects/${projectId}/documents/export`, { download: true });
