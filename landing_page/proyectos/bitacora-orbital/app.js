(() => {
  const missions = [
    {
      id: "origenes", title: "Orígenes e identidad", setting: "Estación Mirador",
      cover: "identidad.jpg", coverAlt: "Dos tripulantes se presentan junto a la ventana de la estación",
      banner: "estacion.jpg", bannerAlt: "Una estación orbital circular sobre un planeta al amanecer",
      summary: "Países, nacionalidades y relaciones",
      brief: "Preséntate ante la tripulación de la Estación Mirador. Aprende a decir de dónde eres y a identificar a tus compañeros de equipo.",
      topics: ["Verbo to be y contracciones", "Preguntas con Where y respuestas con be from", "Adjetivos posesivos: my, your, his, her, our, their", "Países, nacionalidades y relaciones"],
    },
    {
      id: "lugares", title: "Lugares y transporte", setting: "Puerto Faro",
      cover: "transporte.jpg", coverAlt: "Un tren elevado cruza una ciudad costera con un observatorio",
      summary: "Ubicaciones, vecindario y transporte",
      brief: "Ubica el observatorio de Puerto Faro y aprende a dar indicaciones para encontrar el tren, el minibús y la nave de la tripulación.",
      topics: ["Across the street, down the street, next to y between", "Lugares del vecindario: banco, farmacia y escuela", "Transporte: motocicleta, tren y nave"],
    },
    {
      id: "familia", title: "Familia y números", setting: "Archivo Boreal",
      cover: "familia.jpg", coverAlt: "Una familia observa su árbol genealógico proyectado",
      summary: "Parentescos y números del 21 al 101",
      brief: "Consulta el árbol de la familia Vale y usa los números del 21 al 101 para identificar sus expedientes.",
      topics: ["Relaciones familiares: parents, children, wife, husband, brother y sister", "Números del 21 al 101"],
    },
    {
      id: "apariencia", title: "Apariencia física", setting: "Laboratorio Prisma",
      cover: "apariencia.jpg", coverAlt: "Tres tripulantes con distintos tipos de cabello en el laboratorio",
      summary: "Cabello, rasgos y partes de la cara",
      brief: "Describe el cabello y los rasgos de la tripulación para actualizar sus fichas en el Laboratorio Prisma.",
      topics: ["Tipos de cabello: straight, wavy y curly", "Colores de cabello", "Rasgos y partes de la cara: eyes, chin y mouth"],
    },
    {
      id: "ropa", title: "Ropa y tiempo", setting: "Hangar Vector",
      cover: "ropa.jpg", coverAlt: "Una piloto ajusta su chaqueta de vuelo junto a un reloj",
      summary: "Ropa, colores, horas y eventos",
      brief: "Describe la ropa de vuelo de Iris y consulta la agenda del Hangar Vector para llegar a tiempo a las prácticas.",
      topics: ["La hora: o’clock, quarter after y half past", "Trajes, colores y prendas: shirt, jacket y shoes"],
    },
    {
      id: "casas", title: "Casas y habitaciones", setting: "Módulo Umbral",
      cover: "habitaciones.jpg", coverAlt: "Corte de un módulo espacial con sala, dormitorio y cocina",
      summary: "Habitaciones, muebles y electrodomésticos",
      brief: "Recorre las viviendas de la Estación Mirador. Identifica sus habitaciones y describe dónde están los muebles y electrodomésticos.",
      topics: ["Habitaciones: living room, bedroom y kitchen", "Muebles y electrodomésticos"],
    },
  ].map((mission) => ({ ...mission, exam: OrbitalCourse[mission.id].exam }));

  const finalMission = {
    id: "endgame", title: "Travesía final", banner: "travesia.jpg",
    bannerAlt: "Una nave de exploración atraviesa una aurora sobre un planeta",
    exam: OrbitalCourse.endgame.exam,
  };
  const progress = OrbitalEngine.createProgress(missions, finalMission, {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  });
  const main = document.querySelector("main");
  const feedback = document.querySelector("#feedback");
  const statusLabel = { available: "Disponible", locked: "Bloqueada", completed: "Completada" };
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const twoDigits = (value) => String(value).padStart(2, "0");
  const number = (index) => twoDigits(index + 1);
  const missionUrl = (mission) => `#mision/${mission.id}`;
  const artUrl = (file) => `assets/orbital/${file}`;

  function missionCard(mission, index, heading) {
    const state = progress.status(mission.id);
    const stateIcon = { available: "arrow", locked: "lock", completed: "check" };
    return `
      <a class="mission-card ${state}" href="${missionUrl(mission)}">
        <div class="mission-cover">
          <img src="${artUrl(mission.cover)}" alt="" loading="lazy" decoding="async">
          <span class="cover-index" aria-hidden="true">${number(index)}</span>
        </div>
        <div class="mission-copy">
          <p class="card-index">MISIÓN ${number(index)} <span aria-hidden="true">/</span> ${mission.setting}</p>
          <${heading}>${mission.title}</${heading}>
          <p class="card-summary">${mission.summary}</p>
          <span class="card-status">${icon(stateIcon[state])}${statusLabel[state]}</span>
        </div>
      </a>`;
  }

  function missionList(standalone = false) {
    const { completed } = progress.snapshot();
    const state = progress.status(finalMission.id);
    const heading = standalone ? "h1" : "h2";
    const cardHeading = standalone ? "h2" : "h3";
    return `
      <section class="mission-section${standalone ? " standalone" : ""}" aria-labelledby="mission-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow"><span class="line"></span> PLAN DE VUELO</p>
            <${heading} id="mission-heading" tabindex="-1">Misiones</${heading}>
          </div>
          <div class="progress" role="progressbar" aria-label="Misiones completadas" aria-valuenow="${completed.length}" aria-valuemax="${missions.length}">
            <span><strong>${twoDigits(completed.length)} / ${twoDigits(missions.length)}</strong> COMPLETADAS</span>
            <div class="progress-track" aria-hidden="true">${missions.map((_, index) => `<i class="${index < completed.length ? "filled" : ""}"></i>`).join("")}</div>
          </div>
        </div>
        <div class="mission-grid">${missions.map((mission, index) => missionCard(mission, index, cardHeading)).join("")}</div>
      </section>
      <section class="final-feature" aria-labelledby="final-heading">
        <img src="${artUrl(finalMission.banner)}" alt="" loading="lazy" decoding="async">
        <a class="final-card" href="#travesia">
          <div><p class="eyebrow"><span class="line"></span> EXPEDICIÓN AURORA</p><h2 id="final-heading">${finalMission.title}</h2><p>Examen acumulativo de las seis misiones</p></div>
          <span class="final-state">${icon(state === "locked" ? "lock" : state === "completed" ? "check" : "arrow")}
            ${state === "locked" ? "BLOQUEADA" : state === "completed" ? "COMPLETADA" : "DISPONIBLE"}</span>
        </a>
      </section>`;
  }

  function dashboard() {
    const next = missions.find((mission) => progress.status(mission.id) === "available");
    const index = missions.indexOf(next);
    const feature = next ?? finalMission;
    return `
      <section class="hero" aria-labelledby="page-title">
        <div class="hero-art ${feature.banner ? "" : "portrait"}">
          <img src="${artUrl(feature.banner ?? feature.cover)}" alt="${feature.bannerAlt ?? feature.coverAlt}" fetchpriority="high">
        </div>
        <div class="shell hero-inner">
          <div class="hero-copy">
            <p class="eyebrow"><span class="line"></span> ${next ? `MISIÓN ${number(index)} <span class="divider">/</span> ${next.setting}` : "EXPEDICIÓN AURORA"}</p>
            <h1 id="page-title">${feature.title}</h1>
            <p>${next ? next.brief : "Pon a prueba lo aprendido en las seis misiones con el examen acumulativo."}</p>
            <a class="button" href="${next ? missionUrl(next) : "#travesia"}">${next ? "Abrir misión" : "Abrir travesía final"}${icon("arrow")}</a>
          </div>
        </div>
      </section>
      <div class="shell catalog-page">${missionList()}</div>`;
  }

  function missionPage(mission, index) {
    const state = progress.status(mission.id);
    const previous = missions[index - 1];
    return `
      <a class="back-link" href="#misiones">${icon("back")} Todas las misiones</a>
      <section class="detail-panel">
        <div>
          <p class="eyebrow"><span class="line"></span> MISIÓN ${number(index)} <span class="divider">/</span> ${mission.setting}</p>
          <h1 id="page-title" tabindex="-1">${mission.title}</h1>
          <p>${mission.brief}</p>
          <span class="detail-status ${state}">${icon(state === "locked" ? "lock" : state === "completed" ? "check" : "target")} ${statusLabel[state]}</span>
        </div>
        <figure class="detail-art">
          <img src="${artUrl(mission.cover)}" alt="${mission.coverAlt}">
        </figure>
      </section>
      ${state === "locked" ? `
        <section class="content-panel">
          <h2>Acceso restringido</h2>
          <p>Aprueba la evaluación de la misión ${number(index - 1)}, ${previous.title}, para abrir esta misión.</p>
          <a class="button" href="${missionUrl(previous)}">Ver misión anterior ${icon("arrow")}</a>
        </section>` : `
        <section class="content-panel">
          <p class="eyebrow">EXPEDIENTE DE MISIÓN</p>
          <h2>Temario</h2>
          <ul class="topic-list">${mission.topics.map((topic) => `<li>${topic}</li>`).join("")}</ul>
        </section>
        <div id="training"></div>`}`;
  }

  function finalPage() {
    const state = progress.status(finalMission.id);
    const { completed } = progress.snapshot();
    return `
      <a class="back-link" href="#misiones">${icon("back")} Todas las misiones</a>
      <section class="detail-panel final-detail">
        <div>
          <p class="eyebrow"><span class="line"></span> EXPEDICIÓN AURORA <span class="divider">/</span> EXAMEN ACUMULATIVO</p>
          <h1 id="page-title" tabindex="-1">${finalMission.title}</h1>
          <p>Combina gramática, vocabulario, comprensión y escritura de las seis misiones en el desafío de mayor dificultad del curso A1.</p>
        </div>
        <figure class="detail-art">
          <img src="${artUrl(finalMission.banner)}" alt="${finalMission.bannerAlt}">
        </figure>
      </section>
      ${state === "locked" ? `<section class="content-panel">
        <h2>Acceso restringido</h2>
        <p>Aprueba las seis evaluaciones para desbloquear el examen. Llevas ${completed.length} de ${missions.length} misiones completadas.</p>
        <a class="button" href="#misiones">Ver misiones ${icon("arrow")}</a>
      </section>` : `
        <div id="training"></div>
        <p class="final-complete" ${state === "completed" ? "" : "hidden"}>Expedición completada. Has aprobado el examen final de inglés A1.</p>`}`;
  }

  function render({ navigate = false } = {}) {
    OrbitalActivities.stopReport();
    main.querySelector("audio")?.pause();
    const route = location.hash.slice(1);
    const missionIndex = missions.findIndex((mission) => route === `mision/${mission.id}`);
    const isFinal = route === "travesia" || route === "endgame";
    const isListing = route === "misiones";
    const section = isFinal ? "travesia" : (isListing || missionIndex >= 0 ? "misiones" : "inicio");

    document.querySelectorAll("[data-nav]").forEach((link) => {
      if (link.dataset.nav === section) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    updateFinalIcon();

    if (isFinal) main.innerHTML = `<div class="shell detail-page">${finalPage()}</div>`;
    else if (missionIndex >= 0) main.innerHTML = `<div class="shell detail-page">${missionPage(missions[missionIndex], missionIndex)}</div>`;
    else if (isListing) main.innerHTML = `<div class="shell catalog-page">${missionList(true)}</div>`;
    else main.innerHTML = dashboard();

    const training = main.querySelector("#training");
    if (training) {
      const subject = isFinal ? finalMission : missions[missionIndex];
      const following = missions[missionIndex + 1];
      const next = isFinal ? { href: "#misiones", label: "Volver a misiones" }
        : following ? { href: missionUrl(following), label: "Abrir siguiente misión" }
        : { href: "#travesia", label: "Abrir travesía final" };
      OrbitalActivities.mount(training, OrbitalCourse[subject.id], {
        verify: window.OrbitalTraining.verify,
        submitExam: (answers) => window.OrbitalTraining.submitExam(subject.id, answers),
        next,
        final: isFinal,
      });
    }

    const heading = main.querySelector("h1");
    document.title = `${heading.textContent} | Bitácora Orbital`;
    if (navigate) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }

  function updateFinalIcon() {
    document.querySelector("#final-nav-icon").setAttribute("href", progress.status(finalMission.id) === "locked" ? "#i-lock" : "#i-bolt");
  }

  function showFeedback(result) {
    feedback.dataset.result = result.correct ? "correct" : "retry";
    feedback.querySelector("#feedback-character").textContent = result.character;
    feedback.querySelector("#feedback-title").textContent = result.correct ? "Respuesta correcta" : "Revisemos tu respuesta";
    feedback.querySelector("#feedback-copy").textContent = result.explanation;
    const answer = feedback.querySelector("#feedback-answer");
    answer.textContent = result.correct ? "" : result.expected;
    answer.hidden = result.correct;
    if (!feedback.open) feedback.showModal();
  }

  window.OrbitalTraining = Object.freeze({
    verify(exercise, response) {
      const result = OrbitalEngine.evaluate(exercise, response);
      showFeedback(result);
      return result;
    },
    submitExam(id, responses) {
      const result = progress.submitExam(id, responses);
      if (result.state === "graded" && result.passed) {
        updateFinalIcon();
        const badge = main.querySelector(".detail-status");
        if (location.hash === `#mision/${id}` && badge) {
          badge.className = "detail-status completed";
          badge.innerHTML = `${icon("check")} ${statusLabel.completed}`;
        }
        const complete = main.querySelector(".final-complete");
        if (id === finalMission.id && complete) complete.hidden = false;
      }
      return result;
    },
  });

  document.querySelector(".skip-link").addEventListener("click", (event) => {
    event.preventDefault();
    main.focus();
    main.scrollIntoView();
  });
  window.addEventListener("hashchange", () => render({ navigate: true }));
  window.addEventListener("storage", ({ key }) => {
    if (key === progress.key) render();
  });
  render();
})();
