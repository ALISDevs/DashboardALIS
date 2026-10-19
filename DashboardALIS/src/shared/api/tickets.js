const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

if (typeof window !== 'undefined') {
  try {
    window.sessionStorage.removeItem('alis-session');
    window.localStorage.removeItem('alis-session');
  } catch {}
}

export async function getClientDashboard(clientToken) {
  const response = await fetch(`${apiUrl}/api/dashboard/${encodeURIComponent(clientToken)}`, { credentials: 'include' });

  if (!response.ok) {
    throw new Error('No fue posible cargar el dashboard del proyecto.');
  }

  const payload = await response.json();
  return payload.data;
}

export async function postClientFeedback(ticketId, feedback) {
  const response = await fetch(`${apiUrl}/api/tickets/${ticketId}/comments`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-ALIS-Request': '1'
    },
    body: JSON.stringify(feedback)
  });

  if (!response.ok) {
    throw new Error('No fue posible enviar el comentario.');
  }

  const payload = await response.json();
  return payload.data;
}

export async function acceptClientTerms(clientToken, version) {
  const response = await fetch(`${apiUrl}/api/dashboard/${encodeURIComponent(clientToken)}/terms`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-ALIS-Request': '1' },
    body: JSON.stringify({ accepted: true, version })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'No se pudo registrar tu aceptación. Intenta de nuevo.');
  }
  return (await response.json()).data;
}
