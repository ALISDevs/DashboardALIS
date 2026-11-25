(() => {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const escape = (text) => text.replace(/[&<>"']/g, (character) => entities[character]);
  const sections = [
    ["reading", "Reading", "book", "Lee el expediente y responde."],
    ["writing", "Grammar & Writing", "pen", "Completa y ordena las frases."],
    ["listening", "Listening", "headphones", "Escucha el reporte y responde."],
  ];
  let activeReport;

  function stopReport() {
    if (!activeReport) return;
    const { speech, button } = activeReport;
    activeReport = undefined;
    speech.cancel();
    button.textContent = "Reproducir reporte";
  }

  function bindReport(container, report) {
    const button = container.querySelector("[data-play-report]");
    if (!button) return;
    const message = container.querySelector("[data-audio-message]");
    const speech = window.speechSynthesis;
    speech?.getVoices();
    button.addEventListener("click", () => {
      if (activeReport?.button === button) {
        stopReport();
        return;
      }
      stopReport();
      const voices = speech?.getVoices().filter(({ lang, localService }) => localService && /^en(?:-|$)/i.test(lang));
      const voice = voices?.find(({ lang }) => lang.toLowerCase() === "en-gb") ?? voices?.[0];
      if (!voice) {
        message.textContent = "El dispositivo no ofrece una voz inglesa sin conexión. Puedes abrir la transcripción.";
        return;
      }

      const utterance = new SpeechSynthesisUtterance(report.transcript);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.85;
      const finish = (event) => {
        if (activeReport?.utterance !== utterance) return;
        activeReport = undefined;
        button.textContent = "Reproducir reporte";
        if (event.type === "error") message.textContent = "No se pudo reproducir la voz. Puedes abrir la transcripción.";
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      activeReport = { speech, utterance, button };
      message.textContent = "";
      button.textContent = "Detener reporte";
      speech.speak(utterance);
    });
  }

  function sourceMarkup({ title, passage, transcript, speaker, file }) {
    if (passage) {
      return `<div class="training-source">
        <p class="eyebrow">${escape(title)}</p>
        <p lang="en">${escape(passage)}</p>
      </div>`;
    }
    if (transcript) {
      // Un archivo autorizado puede sustituir la voz del dispositivo.
      const localFile = file && /^[a-z0-9-]+\.(?:wav|mp3|ogg|m4a)$/i.test(file);
      return `<div class="training-source">
        <p class="eyebrow">${escape(title)}</p>
        <p>${escape(speaker)} · Reporte de práctica</p>
        ${localFile ? `<audio controls preload="none" src="assets/audio/${escape(file)}" aria-label="${escape(title)}"></audio>`
          : `<button class="button" type="button" data-play-report>Reproducir reporte</button>
          <p class="training-hint">Voz simulada del dispositivo, si tiene una voz inglesa disponible sin conexión.</p>
          <p class="training-message" data-audio-message role="status"></p>`}
        <details class="transcript">
          <summary>Ver transcripción</summary>
          <p lang="en">${escape(transcript)}</p>
        </details>
      </div>`;
    }
    return "";
  }

  function questionMarkup(question, index, english = false) {
    const prompt = `<span${english ? ' lang="en"' : ""}>${escape(question.prompt)}</span>`;
    if (question.type === "choice") {
      return `<fieldset class="training-question" data-question>
        <legend>${index + 1}. ${prompt}</legend>
        ${question.options.map((option, optionIndex) => `<label class="answer-option">
          <input type="radio" name="q${index}" value="${optionIndex}" required>
          <span${english ? ' lang="en"' : ""}>${escape(option)}</span>
        </label>`).join("")}
      </fieldset>`;
    }
    if (question.type === "order") {
      return `<fieldset class="training-question" data-question>
        <legend>${index + 1}. ${prompt}</legend>
        <p class="training-hint">Toca los fragmentos en orden. Toca de nuevo para quitar uno.</p>
        <div class="word-bank" lang="en">${question.words.map((word, wordIndex) =>
          `<button type="button" class="word-tile" data-word="${wordIndex}" aria-pressed="false">${escape(word)}</button>`
        ).join("")}</div>
        <output class="word-preview" aria-live="polite" lang="en"></output>
      </fieldset>`;
    }
    return `<label class="training-question text-question" data-question>
      <span>${index + 1}. ${prompt}</span>
      <input type="text" name="q${index}" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="160" required lang="en">
    </label>`;
  }

  function bindQuestion(group, question) {
    if (question.type === "choice") {
      return () => {
        const checked = group.querySelector("input:checked");
        return checked ? question.options[Number(checked.value)] : "";
      };
    }
    if (question.type === "write") return () => group.querySelector("input").value;

    const picked = [];
    const preview = group.querySelector("output");
    group.querySelectorAll("[data-word]").forEach((button) => {
      const index = Number(button.dataset.word);
      button.addEventListener("click", () => {
        const position = picked.indexOf(index);
        if (position === -1) picked.push(index);
        else picked.splice(position, 1);
        button.setAttribute("aria-pressed", String(position === -1));
        preview.textContent = picked.map((wordIndex) => question.words[wordIndex]).join(" ");
      });
    });
    return () => picked.length === question.words.length ? picked.map((index) => question.words[index]) : [];
  }

  function activityMarkup(unit, [key, title, symbol, description]) {
    const activity = unit[key];
    return `<details class="training-section">
      <summary class="activity">
        <span class="mission-icon"><svg class="icon" aria-hidden="true"><use href="#i-${symbol}"/></svg></span>
        <span><strong>${escape(title)}</strong><small>${description}</small></span>
      </summary>
      <div class="training-body">
        ${sourceMarkup(activity)}
        ${activity.questions.map((question, index) => `<form class="practice-form" data-practice="${key}">
          ${questionMarkup(question, index, key !== "writing")}
          <button class="button" type="submit">Comprobar</button>
          <p class="training-message" role="status"></p>
        </form>`).join("")}
      </div>
    </details>`;
  }

  function examMarkup(unit, final) {
    const { exam } = unit;
    return `<details class="training-section exam-section"${final ? " open" : ""}>
      <summary class="activity">
        <span class="mission-icon"><svg class="icon" aria-hidden="true"><use href="#i-bolt"/></svg></span>
        <span><strong>${final ? "Examen final" : "Evaluación de misión"}</strong>
          <small>${escape(exam.title)} · ${exam.questions.length} preguntas · Aprobación a partir del ${exam.passScore ?? 80} %</small></span>
      </summary>
      <form class="training-body" data-exam>
        <p>Completa todas las respuestas. ${final ? "Usa el expediente y el reporte de voz cuando se indiquen." : "Puedes volver a intentar el examen."}</p>
        ${sourceMarkup({ title: "Expediente del examen", passage: exam.passage })}
        ${exam.audio ? sourceMarkup(exam.audio) : ""}
        ${exam.questions.map((question, index) => questionMarkup(question, index)).join("")}
        <button class="button" type="submit">Calificar examen</button>
        <p class="training-message" role="status"></p>
        <section class="exam-result" tabindex="-1" aria-label="Resultado del examen" hidden></section>
      </form>
    </details>`;
  }

  function showExamResult(panel, result, next) {
    const points = result.results.filter(({ correct }) => correct).length;
    const score = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(result.score);
    panel.dataset.passed = String(result.passed);
    panel.innerHTML = `<h3>${result.passed ? "Examen aprobado" : "Sigue practicando"} · ${score} %</h3>
      <p>${points} de ${result.results.length} respuestas correctas.</p>
      ${result.results.some(({ correct }) => !correct) ? `<ul class="exam-review">
        ${result.results.map((item, index) => item.correct ? "" : `<li><strong>Pregunta ${index + 1}</strong>
          <p>${escape(item.explanation)}</p><p>Respuesta esperada: <span lang="en">${escape(item.expected)}</span></p></li>`).join("")}
      </ul>` : ""}
      ${result.passed ? `<a class="button" href="${escape(next.href)}">${escape(next.label)}</a>` : "<p>Puedes corregir las respuestas y volver a calificar.</p>"}`;
    panel.hidden = false;
    panel.focus();
  }

  function mount(container, unit, { verify, submitExam, next, final }) {
    container.innerHTML = `<section class="activity-list" aria-labelledby="activity-heading">
      <h2 id="activity-heading">${final ? "Desafío acumulativo" : "Entrenamiento de campo"}</h2>
      ${final ? "" : `<details class="training-section" open>
        <summary class="activity">
          <span class="mission-icon"><svg class="icon" aria-hidden="true"><use href="#i-target"/></svg></span>
          <span><strong>Lección de campo</strong><small>Explicaciones y ejemplos para empezar.</small></span>
        </summary>
        <div class="training-body">${unit.notes.map(([title, explanation, example]) =>
          `<div class="lesson-note"><h3>${escape(title)}</h3><p>${escape(explanation)}</p><p lang="en">${escape(example)}</p></div>`
        ).join("")}</div>
      </details>${sections.map((section) => activityMarkup(unit, section)).join("")}`}
      ${examMarkup(unit, final)}
    </section>`;

    bindReport(container, unit.listening ?? unit.exam.audio);

    for (const [key] of sections) {
      container.querySelectorAll(`form[data-practice="${key}"]`).forEach((form, index) => {
        const question = unit[key].questions[index];
        const response = bindQuestion(form.querySelector("[data-question]"), question);
        const message = form.querySelector(".training-message");
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          const answer = response();
          if (Array.isArray(answer) ? answer.length === 0 : !answer.trim()) {
            message.textContent = "Completa la respuesta para comprobarla.";
            return;
          }
          message.textContent = "";
          const result = verify({ ...question, character: unit[key].speaker ?? unit.coach }, answer);
          form.dataset.answer = result.correct ? "correct" : "retry";
        });
      });
    }

    const exam = container.querySelector("[data-exam]");
    const responses = Array.from(exam.querySelectorAll("[data-question]"), (group, index) =>
      bindQuestion(group, unit.exam.questions[index]));
    const message = exam.querySelector(".training-message");
    const panel = exam.querySelector(".exam-result");
    exam.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = submitExam(responses.map((response) => response()));
      if (result.state !== "graded") {
        panel.hidden = true;
        message.textContent = result.state === "incomplete"
          ? "Completa todas las respuestas, incluidos los ejercicios de ordenar."
          : "Vuelve a abrir la misión para consultar su acceso.";
        return;
      }
      message.textContent = "";
      showExamResult(panel, result, next);
    });
  }

  globalThis.OrbitalActivities = Object.freeze({ mount, stopReport });
})();
