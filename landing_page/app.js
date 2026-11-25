(() => {
  'use strict';

  const config = window.ALIS_CONFIG || {};
  const phone = String(config.whatsapp || '').replace(/\D/g, '');
  const makeWhatsAppURL = message => `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  const greeting = config.whatsappGreeting || 'Hola, equipo de ALIS. Me gustaría platicarles sobre un proyecto.';
  document.querySelectorAll('[data-whatsapp]').forEach(link => {
    link.href = makeWhatsAppURL(greeting);
  });
  if (config.email) {
    document.querySelectorAll('a[href^="mailto:"]').forEach(link => { link.href = `mailto:${config.email}`; });
    document.querySelector('.email-link').lastChild.textContent = config.email;
  }
  const localPhone = phone.startsWith('52') ? phone.slice(2) : phone;
  document.querySelector('.contact-direct strong').firstChild.textContent = `${localPhone.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3')} `;
  document.querySelectorAll('svg:not(.svg-library)').forEach(icon => icon.setAttribute('aria-hidden', 'true'));
  document.getElementById('current-year').textContent = new Date().getFullYear();

  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  function closeMenu() {
    mobileMenu.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menú');
  }
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    mobileMenu.hidden = !open;
  });
  mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileMenu.hidden) { closeMenu(); menuToggle.focus(); }
  });
  document.addEventListener('click', event => {
    if (!mobileMenu.hidden && !event.target.closest('.site-header')) closeMenu();
  });
  const mobileQuery = window.matchMedia('(max-width: 760px)');
  mobileQuery.addEventListener('change', event => { if (!event.matches) closeMenu(); });

  const demos = {
    citas: {
      eyebrow: 'TU AGENDA, EN UN SOLO LUGAR', heading: 'Un día bien organizado.',
      totalLabel: 'Citas del día', pendingLabel: 'Por confirmar', doneLabel: 'Confirmadas',
      itemLabel: 'Cita', detailLabel: 'Horario', pending: 'Por confirmar', done: 'Confirmada',
      action: 'Confirmar siguiente cita', finished: 'Agenda confirmada',
      announcement: 'Cita confirmada. Tu agenda se actualizó.',
      finishedHint: 'Todo confirmado. Puedes restablecer la demo para volver a probar.',
      rows: [{name: 'Consulta inicial', detail: '10:00 a. m.', done: false}, {name: 'Seguimiento', detail: '11:30 a. m.', done: true}, {name: 'Valoración', detail: '12:00 p. m.', done: false}],
    },
    pedidos: {
      eyebrow: 'DEL PEDIDO A LA ENTREGA', heading: 'Cada pedido, bajo control.',
      totalLabel: 'Pedidos', pendingLabel: 'En preparación', doneLabel: 'Listos',
      itemLabel: 'Pedido', detailLabel: 'Entrega', pending: 'En preparación', done: 'Listo',
      action: 'Preparar siguiente pedido', finished: 'Pedidos listos',
      announcement: 'Pedido listo. El estado de la entrega se actualizó.',
      finishedHint: 'Los pedidos están listos. Restablece la demo para volver a probar.',
      rows: [{name: 'Pedido de ejemplo #001', detail: 'Recoger', done: false}, {name: 'Pedido de ejemplo #002', detail: 'Envío', done: false}, {name: 'Pedido de ejemplo #003', detail: 'Recoger', done: true}],
    },
    clientes: {
      eyebrow: 'CADA OPORTUNIDAD TIENE UN SIGUIENTE PASO', heading: 'Que no se pierda el hilo.',
      totalLabel: 'Solicitudes', pendingLabel: 'Por atender', doneLabel: 'Con seguimiento',
      itemLabel: 'Oportunidad', detailLabel: 'Interés', pending: 'Por atender', done: 'Contactado',
      action: 'Registrar siguiente contacto', finished: 'Seguimiento al día',
      announcement: 'Contacto registrado. La oportunidad avanzó de etapa.',
      finishedHint: 'Todas las solicitudes tienen seguimiento. Puedes reiniciar la demo.',
      rows: [{name: 'Proyecto de ejemplo A', detail: 'Cotización', done: false}, {name: 'Proyecto de ejemplo B', detail: 'Visita', done: true}, {name: 'Proyecto de ejemplo C', detail: 'Información', done: false}],
    },
  };
  const state = Object.fromEntries(Object.entries(demos).map(([key, demo]) => [key, demo.rows.map(row => ({...row}))]));
  let activeDemo = 'citas';
  const tabs = [...document.querySelectorAll('[data-demo]')];
  const panel = document.getElementById('demo-panel');
  const actionButton = document.getElementById('demo-action');
  const announcement = document.getElementById('demo-announcement');
  const setText = (id, text) => { document.getElementById(id).textContent = text; };

  function renderDemo() {
    const demo = demos[activeDemo];
    const rows = state[activeDemo];
    const done = rows.filter(row => row.done).length;
    const completed = done === rows.length;
    setText('demo-eyebrow', demo.eyebrow);
    setText('demo-heading', demo.heading);
    setText('demo-total-label', demo.totalLabel);
    setText('demo-pending-label', demo.pendingLabel);
    setText('demo-done-label', demo.doneLabel);
    setText('demo-total', rows.length);
    setText('demo-pending', rows.length - done);
    setText('demo-done', done);
    setText('demo-item-label', demo.itemLabel);
    setText('demo-detail-label', demo.detailLabel);
    setText('demo-hint', completed ? demo.finishedHint : 'Prueba una acción y mira el cambio.');
    const fragment = document.createDocumentFragment();
    rows.forEach(row => {
      const line = document.createElement('div');
      line.className = 'demo-row';
      const title = document.createElement('strong');
      title.textContent = row.name;
      const detail = document.createElement('span');
      detail.textContent = row.detail;
      const badge = document.createElement('span');
      badge.className = `row-badge${row.done ? ' is-done' : ''}`;
      badge.textContent = row.done ? demo.done : demo.pending;
      line.append(title, detail, badge);
      fragment.append(line);
    });
    document.getElementById('demo-rows').replaceChildren(fragment);
    actionButton.textContent = completed ? demo.finished : demo.action;
    if (!completed) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#icon-arrow');
      svg.setAttribute('aria-hidden', 'true');
      svg.append(use);
      actionButton.append(svg);
    }
    actionButton.disabled = completed;
    panel.setAttribute('aria-labelledby', `tab-${activeDemo}`);
    tabs.forEach(tab => {
      const selected = tab.dataset.demo === activeDemo;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
  }
  function selectDemo(tab) {
    activeDemo = tab.dataset.demo;
    announcement.textContent = '';
    renderDemo();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectDemo(tab));
    tab.addEventListener('keydown', event => {
      let target;
      if (['ArrowDown', 'ArrowRight'].includes(event.key)) target = (index + 1) % tabs.length;
      if (['ArrowUp', 'ArrowLeft'].includes(event.key)) target = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      if (target !== undefined) { event.preventDefault(); tabs[target].focus(); selectDemo(tabs[target]); }
    });
  });
  actionButton.addEventListener('click', () => {
    const next = state[activeDemo].find(row => !row.done);
    if (!next) return;
    next.done = true;
    renderDemo();
    announcement.textContent = demos[activeDemo].announcement;
    if (actionButton.disabled) document.getElementById('demo-reset').focus();
  });
  document.getElementById('demo-reset').addEventListener('click', () => {
    state[activeDemo] = demos[activeDemo].rows.map(row => ({...row}));
    renderDemo();
    announcement.textContent = 'Demostración restablecida.';
  });
  const tabsQuery = window.matchMedia('(max-width: 1000px)');
  const setOrientation = () => document.querySelector('.demo-options').setAttribute('aria-orientation', tabsQuery.matches ? 'horizontal' : 'vertical');
  tabsQuery.addEventListener('change', setOrientation);
  setOrientation();
  renderDemo();

  const serviceSelect = document.getElementById('contact-service');
  document.querySelectorAll('[data-interest]').forEach(link => {
    link.addEventListener('click', () => { serviceSelect.value = link.dataset.interest; });
  });
  const form = document.getElementById('contact-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const business = String(data.get('business') || '').trim();
    const service = String(data.get('service') || '').trim();
    const message = String(data.get('message') || '').trim();
    const nameField = document.getElementById('contact-name');
    const messageField = document.getElementById('contact-message');
    nameField.setCustomValidity(name ? '' : 'Escribe tu nombre.');
    messageField.setCustomValidity(message.length >= 10 ? '' : 'Cuéntanos tu idea en al menos 10 caracteres.');
    if (!form.reportValidity()) return;
    const lines = ['Hola, equipo de ALIS.', '', `Soy ${name}.`, business ? `Mi negocio: ${business}.` : '', `Me interesa: ${service}.`, '', message].filter((line, index, all) => line !== '' || all[index - 1] !== '');
    const url = makeWhatsAppURL(lines.join('\n'));
    const fallback = document.getElementById('form-fallback');
    fallback.href = url;
    fallback.hidden = false;
    document.getElementById('form-status').textContent = 'Tu mensaje está listo. Puedes revisarlo en WhatsApp antes de enviarlo.';
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  form.querySelectorAll('input,textarea').forEach(field => field.addEventListener('input', () => field.setCustomValidity('')));

  if ('IntersectionObserver' in window) {
    const links = [...document.querySelectorAll('.desktop-nav a')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) links.forEach(link => link.classList.toggle('is-active', link.hash === `#${entry.target.id}`));
      });
    }, { rootMargin: '-15% 0px -60% 0px', threshold: 0 });
    links.forEach(link => { const target = document.querySelector(link.hash); if (target) observer.observe(target); });
  }
})();
