(() => {
  const normalize = (value) => {
    const text = Array.isArray(value) && value.every((word) => typeof word === "string")
      ? value.join(" ")
      : value;
    return typeof text === "string"
      ? text.normalize("NFC").trim().replace(/\s+/gu, " ").replace(/[‘’]/gu, "'").toLowerCase()
      : "";
  };

  // accepted admite variantes completas. Para ordenar palabras, la respuesta puede ser un arreglo.
  function evaluate(exercise, response) {
    const accepted = exercise?.accepted;
    if (!Array.isArray(accepted) || !accepted.length || !accepted.every((answer) => normalize(answer))
        || typeof exercise.explanation !== "string" || !exercise.explanation.trim()) {
      throw new TypeError("El ejercicio requiere respuestas válidas y una explicación.");
    }

    const answer = normalize(response);
    const correct = Boolean(answer) && accepted.some((option) => normalize(option) === answer);
    const mistake = !correct && answer
      && exercise.mistakes?.find(({ response: option }) => normalize(option) === answer);

    return {
      correct,
      character: exercise.character || "Centro de comunicaciones",
      explanation: correct ? exercise.explanation : mistake?.explanation || exercise.explanation,
      expected: Array.isArray(accepted[0]) ? accepted[0].join(" ") : accepted[0],
    };
  }

  function createProgress(missions, endgame, storage) {
    // Conserva el avance de la versión anterior de la academia.
    const key = "shield-academy.progress.v1";
    const empty = { completed: [], endgamePassed: false };
    let progress = empty;
    let unsaved = false;

    function load() {
      try {
        const saved = JSON.parse(storage.getItem(key));
        if (!saved) return progress;
        const completed = [];
        for (const { id } of missions) {
          if (!Array.isArray(saved.completed) || !saved.completed.includes(id)) break;
          completed.push(id);
        }
        const endgamePassed = completed.length === missions.length && saved.endgamePassed === true;
        if (unsaved && (completed.length < progress.completed.length || (progress.endgamePassed && !endgamePassed))) {
          return progress;
        }
        progress = { completed, endgamePassed };
        unsaved = false;
      } catch {
        // Conserva el avance de la sesión si el navegador no permite guardarlo.
      }
      return progress;
    }

    function status(id) {
      const { completed, endgamePassed } = load();
      if (id === endgame.id) {
        if (endgamePassed) return "completed";
        return completed.length === missions.length ? "available" : "locked";
      }
      const index = missions.findIndex((mission) => mission.id === id);
      if (index < 0 || index > completed.length) return "locked";
      return index < completed.length ? "completed" : "available";
    }

    function submitExam(id, responses) {
      if (status(id) === "locked") return { state: "locked" };
      const mission = id === endgame.id ? endgame : missions.find((item) => item.id === id);
      const { questions, passScore = 80 } = mission.exam ?? {};
      if (!Array.isArray(questions) || !questions.length) return { state: "pending" };
      if (!Number.isFinite(passScore) || passScore < 1 || passScore > 100) {
        throw new RangeError("La nota de aprobación debe estar entre 1 y 100.");
      }
      if (!Array.isArray(responses) || responses.length !== questions.length
          || questions.some((_, index) => !normalize(responses[index]))) {
        return { state: "incomplete" };
      }

      const results = questions.map((question, index) => evaluate(question, responses[index]));
      const correct = results.filter((result) => result.correct).length;
      const score = correct * 100 / results.length;
      const passed = score >= passScore;

      if (passed && status(id) !== "completed") {
        const { completed, endgamePassed } = progress;
        progress = {
          completed: id === endgame.id ? completed : [...completed, id],
          endgamePassed: endgamePassed || id === endgame.id,
        };
        try {
          storage.setItem(key, JSON.stringify(progress));
          unsaved = false;
        } catch {
          unsaved = true;
        }
      }
      return { state: "graded", score, passed, results };
    }

    return { status, submitExam, snapshot: load, key };
  }

  globalThis.OrbitalEngine = Object.freeze({ evaluate, createProgress });
})();
