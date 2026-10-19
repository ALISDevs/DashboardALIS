export function projectProgress(tickets) {
  const publicTickets = tickets.filter((ticket) => ticket.isVisibleToClient);
  const resolved = publicTickets.filter((ticket) => ticket.status === 'RESOLVED').length;
  const total = publicTickets.length;
  return {
    total, resolved,
    percent: total ? Math.floor(resolved / total * 100) : 0,
    label: total === 0 ? 'Sin hitos públicos' : resolved === total ? 'Finalizado' : 'En proceso'
  };
}
