import {
  type Data,
  today,
  latest,
  targets,
  macros,
  fmt,
  PHASES,
  range,
  shift,
  profile,
  trainsToday,
  hour,
  mean,
  days,
  ago,
  weightStatus,
  dayStatus,
} from "./body.ts";
const clock = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export function nextStep(data: Data) {
  const time = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date()),
    [h, m] = time.split(":").map(Number),
    minutes = h * 60 + m,
    me = profile(data),
    start = me.bjjTime
      ? Number(me.bjjTime.slice(0, 2)) * 60 + Number(me.bjjTime.slice(3, 5))
      : null,
    train = trainsToday(data) && start != null,
    meals = data.meals
      .filter((x) => x.date === today())
      .sort((a, b) => b.time.localeCompare(a.time)),
    last = meals[0],
    check = data.daily_checkins.find((x) => x.date === today()),
    t = targets(data),
    total = macros(meals),
    settings = latest(data.settings);
  const action = !check
    ? "Comece com um check-in rápido de sono, fome e energia."
    : check.energy < 4 || check.fatigue > 7
      ? "Sua recuperação pede atenção. Priorize descanso e converse com seu treinador antes de aumentar a carga."
      : train && minutes < start!
        ? `Jiu-Jitsu hoje às ${hour(me.bjjTime)}. ${minutes < start! - 120 ? `Planeje uma refeição entre ${hour(clock(start! - 180))} e ${hour(clock(start! - 120))}.` : "Se estiver perto do treino, escolha uma porção de fácil digestão conforme sua tolerância."}`
        : train && minutes >= start! + 120
          ? "Após o treino, faça sua refeição habitual com proteína e carboidrato conforme a fome."
          : typeof check.steps === "number" &&
              check.steps < (settings?.steps ?? 8000)
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
// Readings the screens show next to each other. Each one says what kind of
// statement it is and which records support it, so a sparse week reads as
// "not enough data" instead of a conclusion.
export type InsightKind =
  | "observação"
  | "estimativa"
  | "sugestão"
  | "dados insuficientes";
export type Insight = {
  area: "Peso" | "Alimentação" | "Recuperação" | "Treino" | "Energia" | "Evento";
  kind: InsightKind;
  text: string;
  basis: string;
};
const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;
const shortDay = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}`;
export function insights(data: Data, asOf = today()): Insight[] {
  const out: Insight[] = [];
  const w = weightStatus(data.weight_logs, asOf);
  const window7 = `${shortDay(shift(asOf, -6))}–${shortDay(asOf)}`;
  if (!w.last)
    out.push({
      area: "Peso",
      kind: "dados insuficientes",
      text: "Nenhuma pesagem registrada ainda.",
      basis: "Sem registros de peso",
    });
  else {
    if (w.mean != null)
      out.push({
        area: "Peso",
        kind: "observação",
        text: `Média de 7 dias: ${fmt(w.mean)} kg.`,
        basis: `${plural(w.week, "pesagem", "pesagens")} · ${window7}`,
      });
    if (w.trend != null) {
      const pct = (w.trend / w.mean!) * 100;
      out.push({
        area: "Peso",
        kind: "estimativa",
        text: `Ritmo de ${w.trend > 0 ? "+" : ""}${fmt(w.trend)} kg por semana (${pct > 0 ? "+" : ""}${fmt(pct)}% do peso). Água, sal e intestino ainda pesam nesse número.`,
        basis: `Média desta semana contra a anterior · ${w.week} e ${w.previous} pesagens`,
      });
    } else
      out.push({
        area: "Peso",
        kind: "dados insuficientes",
        text:
          w.age != null && w.age > 6
            ? `Última pesagem ${ago(w.last.date, asOf)}. Sem pesagens recentes não há média nem tendência.`
            : "A tendência precisa de 3 pesagens em cada uma das duas últimas semanas.",
        basis: `Esta semana: ${w.week} de 3 · semana anterior: ${w.previous} de 3`,
      });
  }
  // Food: only days the athlete closed as complete describe what was eaten.
  // Today is still open, so it never counts here.
  const loggedDays = [
    ...new Set(range(data.meals, shift(asOf, -7), shift(asOf, -1)).map((x) => x.date)),
  ];
  const complete = loggedDays.filter((d) => dayStatus(data, d).complete);
  const t = targets(data);
  const dayTotal = (d: string) => macros(data.meals.filter((x) => x.date === d));
  if (complete.length >= 3) {
    const p = mean(complete.map((d) => dayTotal(d).protein))!,
      k = mean(complete.map((d) => dayTotal(d).calories))!;
    out.push({
      area: "Alimentação",
      kind: "observação",
      text: `Nos dias completos: ${fmt(k, 0)} kcal e ${fmt(p, 0)} g de proteína em média (metas: ${fmt(t.calories, 0)} kcal e ${fmt(t.protein, 0)} g).`,
      basis: `${plural(complete.length, "dia completo", "dias completos")} nos 7 dias antes de hoje`,
    });
    if (p < t.protein * 0.85)
      out.push({
        area: "Alimentação",
        kind: "sugestão",
        text: `A proteína ficou ~${fmt(t.protein - p, 0)} g abaixo da meta. Uma porção a mais em uma refeição (ovos, frango, whey sem lactose) costuma fechar a diferença.`,
        basis: "Média dos dias completos contra a sua meta",
      });
  } else
    out.push({
      area: "Alimentação",
      kind: "dados insuficientes",
      text: loggedDays.length
        ? `${plural(loggedDays.length, "dia tem", "dias têm")} refeições, mas ${complete.length ? `só ${plural(complete.length, "foi fechado", "foram fechados")}` : "nenhum foi fechado"} como completo. Médias de dias parciais subestimam o que você comeu.`
        : "Sem refeições registradas nos 7 dias antes de hoje.",
      basis: "A média alimentar começa com 3 dias completos",
    });
  const checks = range(data.daily_checkins, shift(asOf, -6), asOf);
  if (checks.length >= 3) {
    const sleep = mean(checks.map((x) => x.hours))!,
      energy = mean(checks.map((x) => x.energy))!,
      fatigue = mean(checks.map((x) => x.fatigue))!;
    out.push({
      area: "Recuperação",
      kind: "observação",
      text: `Sono médio de ${fmt(sleep)} h, energia ${fmt(energy)}/10 e fadiga ${fmt(fatigue)}/10.`,
      basis: `${plural(checks.length, "check-in", "check-ins")} · ${window7}`,
    });
    if (sleep < 7 || energy < 5 || fatigue > 6)
      out.push({
        area: "Recuperação",
        kind: "sugestão",
        text:
          sleep < 7
            ? "O sono está abaixo de 7 h. Antes de mexer em comida ou cardio, proteja o horário de dormir."
            : "Energia baixa ou fadiga alta se repetem. Evite somar volume de treino ou cortar calorias nesta semana.",
        basis: "Médias dos check-ins da semana",
      });
  } else
    out.push({
      area: "Recuperação",
      kind: "dados insuficientes",
      text: `${plural(checks.length, "check-in", "check-ins")} nos últimos 7 dias. A leitura de recuperação começa com 3.`,
      basis: window7,
    });
  const recent = range(data.jiujitsu_sessions, shift(asOf, -6), asOf),
    before = range(data.jiujitsu_sessions, shift(asOf, -20), shift(asOf, -7));
  if (recent.length >= 2 && before.length >= 2) {
    const a = mean(recent.map((x) => x.performance))!,
      b = mean(before.map((x) => x.performance))!;
    out.push({
      area: "Treino",
      kind: "observação",
      text: `Performance no Jiu-Jitsu: ${fmt(a)}/10 nesta semana contra ${fmt(b)}/10 nas duas anteriores (${Math.abs(a - b) < 0.5 ? "estável" : a > b ? "melhor" : "pior"}).`,
      basis: `${recent.length} treinos recentes e ${before.length} anteriores · nota dada por você`,
    });
  } else
    out.push({
      area: "Treino",
      kind: "dados insuficientes",
      text: `${plural(recent.length, "treino", "treinos")} de Jiu-Jitsu nesta semana e ${before.length} nas duas anteriores. Comparar performance pede 2 em cada período.`,
      basis: "Registros de Jiu-Jitsu",
    });
  // Energy adjustment only with trend, complete food days and check-ins together.
  if (w.trend != null && complete.length >= 3 && checks.length >= 3) {
    const rate = w.trend / w.mean!,
      hunger = mean(checks.map((x) => x.hunger)) ?? 0,
      energy = mean(checks.map((x) => x.energy)) ?? 10;
    out.push({
      area: "Energia",
      kind: "sugestão",
      text:
        rate < -0.01 || hunger > 7 || energy < 4
          ? "Perda rápida ou recuperação ruim. Considere subir 100–150 kcal e rever o sono. Nada foi alterado."
          : rate > -0.001
            ? "Peso estável. Confira cintura e se os dias estão completos antes de pensar em reduzir ~100 kcal. Nada foi alterado."
            : "Ritmo gradual. Mantenha as metas enquanto força, energia e cintura acompanham. Nada foi alterado.",
      basis: "Tendência de peso, dias completos e check-ins da semana",
    });
  }
  const event = data.competition_events.find(
    (e) => !e.archived && e.eventDate >= asOf,
  );
  if (event && w.mean != null && w.trend != null) {
    const until = days(event.eventDate, asOf),
      gi = event.withGi ? event.gi : 0,
      projected = w.mean + (w.trend * until) / 7,
      gap = w.mean + gi - event.limit,
      needed = gap > 0 ? (gap / Math.max(1, until)) * 7 : 0;
    out.push({
      area: "Evento",
      kind: "estimativa",
      text: `Mantido o ritmo atual, ~${fmt(projected)} kg sem kimono em ${shortDay(event.eventDate)}${event.withGi ? ` (~${fmt(projected + gi)} kg com kimono)` : ""}. Limite: ${fmt(event.limit)} kg. Quanto mais longe a data, maior a incerteza.`,
      basis: `Extrapolação da tendência · ${until} dias até o evento`,
    });
    if (needed > w.mean * 0.01)
      out.push({
        area: "Evento",
        kind: "sugestão",
        text: `Chegar ao limite pediria ~${fmt(needed)} kg por semana, acima de 1% do peso. Converse com o treinador sobre a categoria em vez de acelerar o corte.`,
        basis: "Diferença até o limite dividida pelas semanas restantes",
      });
  }
  return out;
}
