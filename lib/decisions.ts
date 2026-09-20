import {
  Data,
  today,
  latest,
  targets,
  macros,
  fmt,
  readiness,
  PHASES,
  composition,
  range,
  shift,
} from "./body";
export function nextStep(data: Data) {
  const time = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date()),
    [h, m] = time.split(":").map(Number),
    minutes = h * 60 + m,
    day = new Date(today() + "T12:00:00Z").getUTCDay(),
    train = [1, 3, 5].includes(day),
    meals = data.meals
      .filter((x) => x.date === today())
      .sort((a, b) => b.time.localeCompare(a.time)),
    last = meals[0],
    check = data.daily_checkins.find((x) => x.date === today()),
    t = targets(data),
    total = macros(meals),
    settings = latest(data.settings);
  let action = !check
    ? "Comece com um check-in rápido de sono, fome e energia."
    : check.energy < 4 || check.fatigue > 7
      ? "Sua recuperação pede atenção. Priorize descanso e converse com seu treinador antes de aumentar a carga."
      : train && minutes < 900
        ? `Jiu-Jitsu na rotina às 15h. ${minutes < 780 ? "Planeje uma refeição entre 12h e 13h." : "Se estiver perto do treino, escolha uma porção de fácil digestão conforme sua tolerância."}`
        : train && minutes >= 1020
          ? "Após o treino, faça sua refeição habitual com proteína e carboidrato conforme a fome."
          : (check.steps ?? 0) < (settings?.steps ?? 8000)
            ? "Se estiver recuperado, uma caminhada leve pode completar seu movimento do dia."
            : "Mantenha as refeições regulares e reserve tempo para dormir.";
  return `${time} · ${action}\n${last ? `Última refeição registrada: ${last.name}, às ${last.time}.` : "Você ainda não registrou refeições hoje."}\n${fmt(Math.max(0, t.calories - total.calories), 0)} kcal e ${fmt(Math.max(0, t.protein - total.protein), 0)} g de proteína restantes nas metas registradas. Confira se o diário está completo. A meta principal continua sendo composição corporal e performance.`;
}
export function phaseSuggestion(data: Data) {
  if (
    data.competition_events.some((x) => x.archived) &&
    !data.competition_events.some((x) => !x.archived)
  )
    return {
      phase: PHASES[4],
      reason:
        "Seu evento terminou. Reavalie energia, fotos, cintura e desempenho antes de escolher a próxima direção.",
    };
  if (
    data.competition_events.some(
      (x) => !x.archived && x.eventDate <= shift(today(), 28),
    )
  )
    return {
      phase: PHASES[3],
      reason:
        "Há um evento nas próximas quatro semanas. Priorize chegar recuperado e competitivo.",
    };
  const checks = range(data.daily_checkins, shift(today(), -6));
  if (checks.filter((c) => c.energy < 4 || c.hunger > 8).length >= 3)
    return {
      phase: PHASES[1],
      reason:
        "Fome alta ou energia baixa se repetem. Considere manutenção enquanto revisa a recuperação.",
    };
  return {
    phase: PHASES[0],
    reason:
      "Sua intenção atual é reduzir gordura preservando massa muscular; avalie a resposta ao longo das semanas.",
  };
}
