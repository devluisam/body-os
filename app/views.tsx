"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowUpRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Droplets,
  Dumbbell,
  Flame,
  Heart,
  Pencil,
  Plus,
  Scale,
  Send,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  Utensils,
} from "lucide-react";
import {
  Data,
  Draft,
  Row,
  Table,
  TABLES,
  schemas,
  today,
  shift,
  days,
  fmt,
  mean,
  latest,
  range,
  composition,
  weightMean,
  weightStatus,
  readiness,
  targets,
  macros,
  assessment,
  mealIdea,
  mealPlan,
  slotAt,
  nowTime,
  profile,
  trainsToday,
  hour,
  ago,
  dayStatus,
  report,
  canonicalId,
  type DayState,
} from "@/lib/body";
import { delivery, lactoseNote } from "@/lib/coach";
import { insights, nextStep, phaseSuggestion, type Insight } from "@/lib/decisions";
import { RecordForm, Save } from "./forms";
import { TrendChart, type Series } from "./chart";
export type ViewProps = Props;
type MealItem = { name?: string; grams?: number };
export type ImportRow = { table: Table; data: Row };
type Props = {
  data: Data;
  open: (kind: string, row?: Draft) => void;
  save: Save;
  refresh: () => Promise<unknown>;
  notice: (s: string) => void;
  go: (s: string) => void;
  remove: (table: Table, id: string) => void;
  ask: (question: string, action?: string, detail?: string) => Promise<boolean>;
  importRows: (rows: ImportRow[]) => Promise<void>;
  pending: number;
};
const message = (e: unknown) =>
  e instanceof Error ? e.message : String(e ?? "Erro inesperado");
export function Stat({
  title,
  value,
  unit,
  foot,
  icon,
}: {
  title: ReactNode;
  value: ReactNode;
  unit?: string;
  foot?: ReactNode;
  icon?: ReactNode;
}) {
  // A missing value is a dash on its own: "— %" reads like a measured number.
  const missing = value === "—" || value == null;
  return (
    <div className="stat card">
      <div className="stat-title">
        {title}
        {icon}
      </div>
      <div className={"stat-value" + (missing ? " missing" : "")}>
        {missing ? "—" : value}
        {!missing && unit && <span>{unit}</span>}
      </div>
      <small>{foot}</small>
    </div>
  );
}
function shortDate(date: string) {
  const [y, m, d] = date.split("-");
  return y === today().slice(0, 4) ? `${d}/${m}` : `${d}/${m}/${y}`;
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <Activity size={24} aria-hidden />
      <p>{children}</p>
    </div>
  );
}
function Button({
  children,
  onClick,
  primary = false,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={"button " + (primary ? "primary" : "")}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
// Rows saved on this device and not yet confirmed by the server.
function PendingBadge({ row }: { row: Row }) {
  return row._pending ? (
    <span className="badge pending" title="Salvo neste aparelho, aguardando envio">
      no aparelho
    </span>
  ) : null;
}
function Meter({
  name,
  value,
  total,
  color = "var(--primary)",
  unit = "g",
  empty = false,
}: {
  name: string;
  value: number;
  total: number;
  color?: string;
  unit?: string;
  empty?: boolean;
}) {
  return (
    <div className="meter">
      <div>
        <span>{name}</span>
        <strong>
          {empty ? "—" : fmt(value, 0)}{" "}
          <small>
            / {fmt(total, 0)} {unit}
          </small>
        </strong>
      </div>
      <div className="track" aria-hidden>
        <i
          style={{
            transform: `scaleX(${total && !empty ? Math.min(1, value / total) : 0})`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}
function Periods({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="tabs small-tabs" role="group" aria-label="Período">
      {[30, 60, 90].map((n) => (
        <button
          type="button"
          key={n}
          className={value === n ? "selected" : ""}
          aria-pressed={value === n}
          aria-label={`Últimos ${n} dias`}
          onClick={() => onChange(n)}
        >
          {n}d
        </button>
      ))}
    </div>
  );
}
// Daily weight plus the 7-day mean, drawn only on days whose window holds the
// 3 weigh-ins the mean needs: the line never shows a mean the numbers lack.
function weightSeries(data: Data): Series[] {
  const points = [...data.weight_logs].sort((a, b) => a.date.localeCompare(b.date));
  return [
    {
      name: "Peso",
      color: "var(--chart-weight)",
      width: 1.5,
      points: points.map((w) => ({ date: w.date, value: w.weight, hollow: !!w.source })),
    },
    {
      name: "Média 7 dias",
      color: "var(--primary)",
      width: 2.5,
      dots: false,
      points: points
        .filter((w) => range(data.weight_logs, shift(w.date, -6), w.date).length >= 3)
        .map((w) => ({ date: w.date, value: weightMean(data.weight_logs, w.date)! })),
    },
  ];
}
function WeightChart({ data, period }: { data: Data; period: number }) {
  const series = weightSeries(data);
  const inPeriod = series[0].points.filter((p) => p.date >= shift(today(), -period));
  if (!inPeriod.length)
    return (
      <Empty>
        {data.weight_logs.length
          ? `Nenhuma pesagem nos últimos ${period} dias. A última foi ${ago(latest(data.weight_logs)!.date)}.`
          : "O gráfico começa na primeira pesagem."}
      </Empty>
    );
  return (
    <>
      <TrendChart series={series} period={period} unit="kg" title={`Peso nos últimos ${period} dias`} />
      {series[1].points.every((p) => p.date < shift(today(), -period)) && (
        <small className="chart-note">
          A média de 7 dias aparece quando houver 3 pesagens dentro de uma
          semana.
        </small>
      )}
    </>
  );
}
// The weight panel answers "how am I trending?" with the basis visible.
function WeightPanel({ data, open }: Props) {
  const [period, setPeriod] = useState(30),
    w = weightStatus(data.weight_logs);
  const stale = w.age != null && w.age > 3;
  return (
    <section className="card weight-panel" aria-labelledby="weight-title">
      <div className="card-head">
        <div>
          <h2 id="weight-title">Peso</h2>
          <small>Sem kimono · pesagem da manhã</small>
        </div>
        <Periods value={period} onChange={setPeriod} />
      </div>
      <div className="weight-readout">
        <div className="weight-main">
          <span className="eyebrow">Última pesagem</span>
          {w.last ? (
            <>
              <strong className="big-number">
                {fmt(w.last.weight)}
                <span>kg</span>
              </strong>
              <span className={"age" + (stale ? " stale" : "")}>
                {w.reference ? "Referência informada · " : ""}
                {ago(w.last.date)}
                {stale && " · pese de novo para atualizar"}
              </span>
            </>
          ) : (
            <strong className="big-number missing">—</strong>
          )}
        </div>
        <dl className="weight-facts">
          <div>
            <dt>Média de 7 dias</dt>
            <dd>
              {w.mean != null ? (
                <>
                  {fmt(w.mean)} <span>kg</span>
                </>
              ) : (
                "—"
              )}
            </dd>
            <dd className="fact-note">{w.week} de 3 pesagens nesta semana</dd>
          </div>
          <div>
            <dt>Tendência semanal</dt>
            <dd>
              {w.trend != null ? (
                <>
                  {w.trend > 0 ? "+" : ""}
                  {fmt(w.trend)} <span>kg</span>
                </>
              ) : (
                "—"
              )}
            </dd>
            <dd className="fact-note">
              {w.trend != null
                ? "Média contra a semana anterior"
                : `Semana anterior: ${w.previous} de 3`}
            </dd>
          </div>
        </dl>
      </div>
      <WeightChart data={data} period={period} />
      {!w.last || w.age !== 0 ? (
        <button type="button" className="text-button" onClick={() => open("Peso")}>
          Registrar pesagem <ChevronRight size={15} aria-hidden />
        </button>
      ) : null}
    </section>
  );
}
const STATE_TEXT: Record<DayState, string> = {
  vazio: "Sem registro",
  "em andamento": "Dia em andamento",
  incompleto: "Incompleto",
  completo: "Dia completo",
};
function DayStateChip({ state }: { state: DayState }) {
  return <span className={`state-chip ${state.replace(" ", "-")}`}>{STATE_TEXT[state]}</span>;
}
// One tap closes a day as complete (or reopens it). Until then its totals are
// a floor, and weekly averages leave it out when complete days exist.
function CloseDay({ data, save, date }: Props & { date: string }) {
  const s = dayStatus(data, date);
  if (!s.meals && !s.complete) return null;
  return (
    <button
      type="button"
      className={"button" + (s.complete ? "" : " close-day")}
      onClick={() =>
        save(
          "nutrition_days",
          { date, complete: !s.complete },
          {
            notice: s.complete
              ? "Dia reaberto: os totais voltam a contar como parciais."
              : "Dia fechado como completo. Ele passa a valer nas médias.",
          },
        )
      }
    >
      <Check size={16} aria-hidden />
      {s.complete ? "Reabrir o dia" : "Fechar o dia como completo"}
    </button>
  );
}
function FoodToday(p: Props) {
  const { data, open } = p,
    plan = mealPlan(data),
    t = plan.goal,
    m = plan.eaten,
    s = dayStatus(data),
    logged = s.meals > 0;
  return (
    <section className="card nutrition-card" aria-labelledby="food-title">
      <div className="card-head">
        <div>
          <h2 id="food-title">Alimentação de hoje</h2>
          <small>
            {plan.slots.filter((x) => x.done).length} de {plan.slots.length} refeições do plano
          </small>
        </div>
        <DayStateChip state={s.state} />
      </div>
      <div
        className="calorie-ring"
        style={{ "--progress": Math.min(100, (m.calories / t.calories) * 100) + "%" } as CSSProperties}
      >
        <div>
          <strong>{fmt(logged ? Math.max(0, t.calories - m.calories) : t.calories, 0)}</strong>
          <small>{logged ? "kcal restantes" : "kcal de meta"}</small>
          {logged && <small>{fmt(m.calories, 0)} registradas</small>}
        </div>
      </div>
      <Meter name="Proteína" value={m.protein} total={t.protein} empty={!logged} />
      <Meter name="Carboidratos" value={m.carbs} total={t.carbs} color="var(--chart-carb)" empty={!logged} />
      <Meter name="Gorduras" value={m.fat} total={t.fat} color="var(--chart-fat)" empty={!logged} />
      <p className="insight">
        {plan.next
          ? `Próxima: ${plan.next.name} por volta das ${plan.next.time} · ~${fmt(plan.next.target.calories, 0)} kcal e ${fmt(plan.next.target.protein, 0)} g de proteína.`
          : "Todas as refeições do plano têm registro hoje."}
        {logged && !s.complete && " Os totais contam só o que foi registrado até agora."}
      </p>
      <div className="card-actions">
        <Button
          onClick={() =>
            open("Refeição", plan.next ? { name: plan.next.name, time: plan.next.name === slotAt().name ? nowTime() : plan.next.time } : undefined)
          }
        >
          <Plus size={16} aria-hidden /> Registrar refeição
        </Button>
        {logged && <CloseDay {...p} date={today()} />}
      </div>
    </section>
  );
}
// The one thing to log next, in the order the day happens:
// morning weigh-in, recovery check-in, then the next planned meal.
function TodayAction({ data, open, go }: Props) {
  const plan = mealPlan(data),
    me = profile(data),
    weighed = data.weight_logs.find((x) => x.date === today()),
    checked = data.daily_checkins.some((x) => x.date === today()),
    next = plan.next,
    meals = plan.slots.filter((s) => s.done).length,
    bjj = trainsToday(data) && me.bjjTime ? hour(me.bjjTime) : null,
    trained = [data.jiujitsu_sessions, data.gym_sessions, data.cardio_sessions].some((t) =>
      t.some((x) => x.date === today()),
    );
  const incomplete = me.age == null || me.height == null || !me.sex;
  const step = incomplete
    ? {
        Icon: Pencil,
        title: "Complete seu perfil",
        body: "Idade, altura e sexo entram no cálculo inicial de calorias e no BF por medidas; os dias de treino organizam o plano. Até lá, as metas usam valores genéricos.",
        label: "Completar perfil",
        act: () => open("Perfil", latest(data.users)),
      }
    : !weighed
    ? {
        Icon: Scale,
        title: "Registre a pesagem da manhã",
        body: "Em jejum, depois do banheiro e sem kimono. A média de 7 dias precisa de 3 pesagens na semana.",
        label: "Registrar peso",
        act: () => open("Peso"),
      }
    : !checked
      ? {
          Icon: Heart,
          title: "Faça o check-in de hoje",
          body: "Seis toques: sono, energia, fadiga, dor, estresse e fome. Alimenta a leitura de recuperação.",
          label: "Fazer check-in",
          act: () => open("Check-in"),
        }
      : next
        ? {
            Icon: Utensils,
            title: `${next.name} por volta das ${next.time}`,
            body:
              `Cerca de ${fmt(next.target.calories, 0)} kcal e ${fmt(next.target.protein, 0)} g de proteína.` +
              (bjj ? ` Jiu-Jitsu hoje às ${bjj}.` : ""),
            label: "Registrar refeição",
            act: () =>
              open("Refeição", {
                date: today(),
                name: next.name,
                time: next.name === slotAt().name ? nowTime() : next.time,
              }),
          }
        : !trained
          ? {
              Icon: Dumbbell,
              title: bjj ? `Jiu-Jitsu hoje às ${bjj}` : "Registre o treino, se treinou",
              body: "Duração, rounds e como você lutou. Comparar performance pede 2 treinos por semana registrados.",
              label: "Registrar treino",
              act: () => open("Treino"),
            }
          : {
              Icon: Check,
              title: "Registros do dia em dia",
              body: dayStatus(data).complete
                ? "Pesagem, check-in, refeições e treino registrados, e o dia está fechado."
                : "Quando terminar de comer, feche o dia em Alimentação para ele valer nas médias.",
              label: dayStatus(data).complete ? "Ver leitura do dia" : "Fechar o dia",
              act: () => go(dayStatus(data).complete ? "Assistente" : "Alimentação"),
            };
  const checklist: [string, boolean][] = [
    [weighed ? `Pesagem ${fmt(weighed.weight)} kg` : "Pesagem", !!weighed],
    ["Check-in", checked],
    [`Refeições ${meals}/${plan.slots.length}`, !next],
    ["Treino", trained],
  ];
  return (
    <section className="card today-card" aria-labelledby="today-title">
      <span className="today-icon" aria-hidden>
        <step.Icon size={22} />
      </span>
      <div className="today-body">
        <small>Próximo registro</small>
        <h2 id="today-title">{step.title}</h2>
        <p>{step.body}</p>
        <ul className="day-checklist" aria-label="Registros de hoje">
          {checklist.map(([label, done]) => (
            <li key={label} className={done ? "done" : ""}>
              {done ? <Check size={14} aria-hidden /> : <span aria-hidden />}
              {label}
              <span className="sr-only">{done ? " feito" : " pendente"}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="today-actions">
        <button type="button" className="button primary" onClick={step.act}>
          <Plus size={17} aria-hidden /> {step.label}
        </button>
      </div>
    </section>
  );
}
const KIND_CLASS: Record<Insight["kind"], string> = {
  observação: "observation",
  estimativa: "estimate",
  sugestão: "suggestion",
  "dados insuficientes": "insufficient",
};
// Observations, estimates and suggestions stay visibly different, each with
// the records behind it.
export function Insights({
  data,
  areas,
  title = "O que seus dados dizem",
}: {
  data: Data;
  areas?: Insight["area"][];
  title?: string;
}) {
  const list = insights(data).filter((i) => !areas || areas.includes(i.area));
  if (!list.length) return null;
  return (
    <section className="card insights" aria-labelledby={`insights-${areas?.join("") ?? "all"}`}>
      <div className="card-head">
        <div>
          <h2 id={`insights-${areas?.join("") ?? "all"}`}>{title}</h2>
          <small>Calculado com seus registros · nada é alterado automaticamente</small>
        </div>
      </div>
      <ul>
        {list.map((i) => (
          <li key={i.area + i.kind + i.text} className={KIND_CLASS[i.kind]}>
            <span className="kind">
              {i.area} · {i.kind}
            </span>
            <p>{i.text}</p>
            <small>Base: {i.basis}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
export function Overview(p: Props) {
  const { data, open, go } = p,
    check = data.daily_checkins.find((x) => x.date === today()),
    load = range([...data.jiujitsu_sessions, ...data.cardio_sessions], shift(today(), -1)).reduce(
      (a, x) => a + x.duration * x.rpe,
      0,
    ),
    r = readiness(check, load),
    event = data.competition_events.find((e) => !e.archived && e.eventDate >= today()),
    me = profile(data),
    bjj = trainsToday(data),
    lastBjj = latest(data.jiujitsu_sessions),
    c = composition(data);
  return (
    <>
      <TodayAction {...p} />
      <div className="home-grid">
        <WeightPanel {...p} />
        <FoodToday {...p} />
      </div>
      <Insights data={data} />
      <div className="bottom-grid">
        <section className="card">
          <div className="card-head">
            <h2>Treino</h2>
            <Dumbbell size={18} aria-hidden />
          </div>
          <div className="training-title">
            <span className="tile-icon" aria-hidden>
              <Dumbbell />
            </span>
            <div>
              <h3>{bjj ? "Jiu-Jitsu hoje" : "Sem Jiu-Jitsu hoje"}</h3>
              <p>
                {bjj
                  ? me.bjjTime
                    ? `Às ${hour(me.bjjTime)}`
                    : "Horário não configurado"
                  : me.bjjDays.length
                    ? "Fora dos seus dias de Jiu-Jitsu"
                    : "Dias de treino não configurados"}
              </p>
            </div>
          </div>
          <p className="card-foot">
            {lastBjj
              ? `Último Jiu-Jitsu ${ago(lastBjj.date)}: ${lastBjj.duration} min, performance ${lastBjj.performance}/10.`
              : "Nenhum treino de Jiu-Jitsu registrado ainda."}
          </p>
          <button type="button" className="text-button" onClick={() => open("Treino")}>
            Registrar treino <ChevronRight size={15} aria-hidden />
          </button>
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Recuperação</h2>
            <Heart size={18} aria-hidden />
          </div>
          <div className="readiness">
            <strong>
              {r ?? "—"}
              {r != null && <small>/100</small>}
            </strong>
            <span className="pill">
              {r == null
                ? "Sem check-in hoje"
                : r >= 75
                  ? "Boa recuperação"
                  : r >= 50
                    ? "Observe os sinais"
                    : "Priorize recuperar"}
            </span>
          </div>
          <p className="card-foot">
            {r == null
              ? "O índice usa o check-in de hoje; sem ele não há leitura."
              : "Check-in de hoje e carga das últimas 48 h. Heurística, não diagnóstico."}
          </p>
          <button type="button" className="text-button" onClick={() => open("Check-in", check)}>
            {check ? "Revisar check-in" : "Fazer check-in"} <ChevronRight size={15} aria-hidden />
          </button>
        </section>
        <section className={"card" + (event ? " competition-mini" : "")}>
          <div className="card-head">
            <h2>{event ? event.name : "Composição"}</h2>
            {event ? <Trophy size={18} aria-hidden /> : <Activity size={18} aria-hidden />}
          </div>
          {event ? (
            <>
              <div className="readiness">
                <strong>
                  {days(event.eventDate, today())}
                  <small>dias</small>
                </strong>
              </div>
              <p className="card-foot">
                {shortDate(event.eventDate)} · {event.category} · limite {fmt(event.limit)} kg
              </p>
              <button type="button" className="text-button" onClick={() => go("Campeonato")}>
                Ver preparação <ChevronRight size={15} aria-hidden />
              </button>
            </>
          ) : (
            <>
              <p className="card-foot">
                {c.waist != null || c.bf != null
                  ? `Cintura ${fmt(c.waist)} cm · BF estimado ${fmt(c.bf)}%`
                  : "Sem medidas registradas. Cintura e abdômen mostram mudança que a balança esconde."}
              </p>
              <button type="button" className="text-button" onClick={() => open("Medidas")}>
                Registrar medidas <ChevronRight size={15} aria-hidden />
              </button>
              <button type="button" className="text-button quiet" onClick={() => go("Campeonato")}>
                Cadastrar evento <ChevronRight size={15} aria-hidden />
              </button>
            </>
          )}
        </section>
      </div>
      <div className="quick-bar">
        <span>Registro rápido</span>
        {(
          [
            ["Peso", Scale],
            ["Refeição", Utensils],
            ["Treino", Dumbbell],
            ["Check-in", Heart],
          ] as const
        ).map(([label, Icon]) => (
          <button type="button" key={label} onClick={() => open(label)}>
            <Icon size={16} aria-hidden />
            {label}
            <Plus size={14} aria-hidden />
          </button>
        ))}
      </div>
    </>
  );
}
export function DayPlan({ data, open, date = today() }: Props & { date?: string }) {
  const plan = mealPlan(data, date),
    isToday = date === today();
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Plano de refeições</h2>
          <small>{isToday ? "Horários sugeridos para hoje" : shortDate(date)}</small>
        </div>
        <Clock size={18} className="accent" aria-hidden />
      </div>
      {plan.slots.map((s) => (
        <div className="log-row" key={s.name}>
          <div>
            <h3>
              {s.time} · {s.name}{" "}
              <small className={s.done ? "done-text" : ""}>{s.done ? "registrado" : "pendente"}</small>
            </h3>
            <p>
              {s.done
                ? s.meals
                    .map((x) =>
                      `${x.time} ${(x.items ?? [])
                        .map((i: MealItem) => i.name)
                        .filter(Boolean)
                        .join(", ")}`.trim(),
                    )
                    .join(" · ")
                : s.note}
            </p>
            <small>
              {s.done
                ? `${fmt(s.logged.calories, 0)} kcal · ${fmt(s.logged.protein, 0)} g proteína · meta ~${fmt(s.target.calories, 0)} kcal`
                : `Meta: ~${fmt(s.target.calories, 0)} kcal · ${fmt(s.target.protein, 0)} g proteína`}
            </small>
          </div>
          <button
            type="button"
            className="text-button"
            onClick={() =>
              open("Refeição", {
                date,
                name: s.name,
                time: isToday && s.name === slotAt().name ? nowTime() : s.time,
              })
            }
          >
            {s.done ? "Adicionar" : "Registrar"}
          </button>
        </div>
      ))}
      <p className="insight">
        {plan.remaining > 0
          ? `Faltam ${fmt(plan.remaining, 0)} kcal para a meta do dia.`
          : `O registrado passa ${fmt(-plan.remaining, 0)} kcal da meta do dia.`}{" "}
        Horários e divisão são sugestões de rotina: o que conta é o total do dia
        e a proteína.
      </p>
    </section>
  );
}
function DateNav({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  return (
    <div className="date-nav" role="group" aria-label="Dia">
      <button type="button" className="icon-button" aria-label="Dia anterior" onClick={() => onChange(shift(date, -1))}>
        <ChevronLeft size={18} />
      </button>
      <input
        aria-label="Dia das refeições"
        type="date"
        value={date}
        max={today()}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
      <button
        type="button"
        className="icon-button"
        aria-label="Dia seguinte"
        disabled={date >= today()}
        onClick={() => onChange(shift(date, 1))}
      >
        <ChevronRight size={18} />
      </button>
      {date !== today() && (
        <button type="button" className="text-button" onClick={() => onChange(today())}>
          Hoje
        </button>
      )}
    </div>
  );
}
export function Nutrition(p: Props) {
  const { data, open, remove } = p,
    [date, setDate] = useState(today()),
    [foodQuery, setFoodQuery] = useState(""),
    t = targets(data),
    meals = data.meals
      .filter((x) => x.date === date)
      .sort((a, b) => String(a.time).localeCompare(String(b.time))),
    m = macros(meals),
    s = dayStatus(data, date);
  const foods = data.foods.filter((f) =>
    f.name.toLowerCase().includes(foodQuery.trim().toLowerCase()),
  );
  return (
    <>
      <div className="toolbar">
        <DateNav date={date} onChange={setDate} />
        <Button primary onClick={() => open("Refeição", date === today() ? undefined : { date, time: "12:00", name: slotAt("12:00").name })}>
          <Plus size={16} aria-hidden /> Refeição
        </Button>
        <Button onClick={() => open("Alimento")}>Cadastrar alimento</Button>
        <Button onClick={() => open("Metas")}>Editar metas</Button>
      </div>
      <section className={"card day-status " + s.state.replace(" ", "-")} aria-live="polite">
        <div>
          <DayStateChip state={s.state} />
          <p>
            {s.state === "completo"
              ? "Você fechou este dia: os totais representam o que comeu e entram nas médias da semana."
              : s.state === "vazio"
                ? "Nada registrado neste dia. Sem registro não significa que você comeu zero."
                : s.state === "em andamento"
                  ? `${s.meals} ${s.meals === 1 ? "refeição registrada" : "refeições registradas"} até agora. Quando terminar, feche o dia.`
                  : "Este dia não foi fechado. Os totais são um mínimo, não tudo o que você comeu."}
          </p>
        </div>
        <CloseDay {...p} date={date} />
      </section>
      <div className="stat-grid">
        {(
          [
            ["Calorias", m.calories, t.calories, "kcal"],
            ["Proteína", m.protein, t.protein, "g"],
            ["Carboidratos", m.carbs, t.carbs, "g"],
            ["Gorduras", m.fat, t.fat, "g"],
          ] as const
        ).map(([label, v, max, unit]) => (
          <Stat
            key={label}
            title={label}
            value={meals.length ? fmt(v, 0) : "—"}
            unit={unit}
            foot={
              meals.length
                ? `${s.complete ? "" : "Parcial · "}meta ${fmt(max, 0)} ${unit}`
                : `Sem registro · meta ${fmt(max, 0)} ${unit}`
            }
          />
        ))}
      </div>
      <div className="home-grid">
        <section className="card">
          <div className="card-head">
            <h2>Diário alimentar</h2>
            <small>{meals.length ? `${fmt(m.fiber, 0)} g fibras` : ""}</small>
          </div>
          {meals.length ? (
            meals.map((x) => (
              <div className="log-row meal-row" key={x.id}>
                <div>
                  <h3>
                    {x.name} <small>{x.time}</small> <PendingBadge row={x} />
                  </h3>
                  <p>{x.items.map((i: MealItem) => `${i.grams} g ${i.name}`).join(" · ")}</p>
                  <small>
                    {fmt(x.calories, 0)} kcal · {fmt(x.protein, 0)} g proteína
                  </small>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Repetir ${x.name.toLowerCase()} hoje`}
                    title="Repetir hoje"
                    onClick={() =>
                      open("Refeição", { name: x.name, time: nowTime(), date: today(), items: x.items })
                    }
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Editar ${x.name.toLowerCase()}`}
                    title="Editar"
                    onClick={() => open("Refeição", x)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Excluir ${x.name.toLowerCase()}`}
                    title="Excluir"
                    className="icon-button"
                    onClick={() => remove("meals", x.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <Empty>Nenhuma refeição registrada neste dia.</Empty>
          )}
        </section>
        <DayPlan {...p} date={date} />
      </div>
      <Insights data={data} areas={["Alimentação", "Energia"]} title="Leitura da alimentação" />
      <section className="card">
        <h2>Flexibilidade faz parte</h2>
        <p>
          Uma refeição mais calórica cabe no seu dia. Registre sem culpa e siga
          a rotina, sem compensações extremas. Proteína de referência nas fases
          de redução: 1,8–2,2 g/kg, ajustável. Sua meta atual: {fmt(t.protein, 0)} g.
        </p>
      </section>
      <MealPlanner {...p} />
      <details className="card food-db">
        <summary>Banco de alimentos · {data.foods.length} opções</summary>
        <p>Valores iniciais aproximados; receitas, preparo e marcas variam. Edite pelo rótulo.</p>
        <input
          type="search"
          aria-label="Filtrar alimentos"
          placeholder="Filtrar alimentos"
          value={foodQuery}
          onChange={(e) => setFoodQuery(e.target.value)}
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Alimento / porção</th>
                <th>kcal</th>
                <th>P</th>
                <th>C</th>
                <th>G</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {foods.map((f) => (
                <tr key={f.id}>
                  <td>
                    {f.name}
                    <small className="block">{f.portion} g/ml</small>
                  </td>
                  <td>{fmt(f.calories, 0)}</td>
                  <td>{fmt(f.protein, 1)}</td>
                  <td>{fmt(f.carbs, 1)}</td>
                  <td>{fmt(f.fat, 1)}</td>
                  <td>
                    <button type="button" className="text-button" onClick={() => open("Alimento", f)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
export function MealPlanner({ data, save, notice }: Props) {
  const [available, setAvailable] = useState(""),
    [hunger, setHunger] = useState(5),
    [training, setTraining] = useState(false),
    [time, setTime] = useState(profile(data).bjjTime ?? ""),
    [after, setAfter] = useState(false),
    [items, setItems] = useState<Row[]>([]),
    [kind, setKind] = useState("PF"),
    [mode, setMode] = useState("Em casa"),
    [meal, setMeal] = useState(() => slotAt().name),
    [mealTime, setMealTime] = useState(() => nowTime());
  const m = macros(items),
    plan = mealPlan(data),
    slot = plan.slots.find((s) => s.name === meal) ?? plan.slots[0];
  return (
    <section className="card planner">
      <div className="card-head">
        <div>
          <h2>O que eu como agora?</h2>
          <small>Monta uma refeição com o que você tem ou pede fora</small>
        </div>
        <Sparkles className="accent" aria-hidden />
      </div>
      <div className="tabs" role="group" aria-label="Onde">
        {["Em casa", "Delivery"].map((x) => (
          <button
            type="button"
            key={x}
            className={mode === x ? "selected" : ""}
            aria-pressed={mode === x}
            onClick={() => setMode(x)}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="tabs meal-tabs" role="group" aria-label="Refeição">
        {plan.slots.map((s) => (
          <button
            type="button"
            key={s.name}
            className={meal === s.name ? "selected" : ""}
            aria-pressed={meal === s.name}
            onClick={() => {
              setMeal(s.name);
              setItems([]);
              setMealTime(s.name === slotAt().name ? nowTime() : s.time);
            }}
          >
            {s.done && <Check size={13} aria-hidden />} {s.name}
          </button>
        ))}
      </div>
      <p className="insight">
        <strong>
          {slot.name} · sugestão de horário {slot.time}
        </strong>
        <br />
        Cerca de {fmt(slot.target.calories, 0)} kcal e {fmt(slot.target.protein, 0)} g de proteína ={" "}
        {Math.round(slot.share * 100)}% do seu dia.{" "}
        {slot.done
          ? `Já registrado hoje: ${fmt(slot.logged.calories, 0)} kcal. ${
              slot.remaining > 80
                ? `Ainda cabem ~${fmt(slot.remaining, 0)} kcal nesta refeição.`
                : "Esta refeição já está na meta."
            }`
          : `Ainda não registrado hoje. ${slot.note}`}
      </p>
      {mode === "Delivery" ? (
        <>
          <label>
            Tipo de pedido
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {Object.keys(delivery).map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <p className="insight">
            {delivery[kind]} Para {meal.toLowerCase()}, mire perto de {fmt(slot.target.calories, 0)} kcal e{" "}
            {fmt(slot.target.protein, 0)} g de proteína. Registre a refeição estimada; não há pedido automático.
            {lactoseNote(data)}
          </p>
        </>
      ) : (
        <>
          <label>
            Quais alimentos você tem?
            <input
              placeholder="Tenho peixe, arroz e vinagrete"
              value={available}
              onChange={(e) => setAvailable(e.target.value)}
            />
          </label>
          <div className="form-grid">
            <label>
              Fome: {hunger}/10
              <input
                type="range"
                min="0"
                max="10"
                value={hunger}
                onChange={(e) => setHunger(Number(e.target.value))}
              />
            </label>
            <label>
              Contexto
              <select
                value={after ? "after" : training ? "before" : "rest"}
                onChange={(e) => {
                  setAfter(e.target.value === "after");
                  setTraining(e.target.value === "before");
                }}
              >
                <option value="rest">Sem treino próximo</option>
                <option value="before">Vou treinar</option>
                <option value="after">Acabei de treinar</option>
              </select>
            </label>
            {training && (
              <label>
                Horário do treino
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
            )}
          </div>
          <Button
            onClick={() => {
              const result = mealIdea(available, data, hunger, training || after, meal);
              setItems(result);
              if (!result.length)
                notice("Não reconheci esses alimentos. Cadastre-os no banco ou use a opção Delivery.");
            }}
          >
            Montar minha refeição <ArrowUpRight size={16} aria-hidden />
          </Button>
          {items.length > 0 && (
            <div className="suggestion">
              <h3>
                {meal} ajustável · {mealTime}
              </h3>
              {items.map((x) => (
                <div className="log-row" key={x.id}>
                  <span>{x.name}</span>
                  <strong>{x.grams} g</strong>
                </div>
              ))}
              <p>
                {fmt(m.calories, 0)} kcal · {fmt(m.protein, 0)} g proteína · {fmt(m.carbs, 0)} g carboidratos ·{" "}
                {fmt(m.fat, 0)} g gordura. Estimativa aproximada.{" "}
                {training
                  ? `Treino às ${time}: ajuste intervalo, gordura e fibras à sua tolerância digestiva.`
                  : after
                    ? "Após o treino, combine carboidrato e proteína conforme a fome."
                    : "Ajuste as quantidades à fome e às metas restantes."}
              </p>
              <label>
                Horário desta refeição
                <input type="time" value={mealTime} onChange={(e) => setMealTime(e.target.value)} />
              </label>
              <Button
                onClick={() =>
                  save("meals", {
                    date: today(),
                    name: meal,
                    time: mealTime,
                    items: items.map((x) => ({ foodId: x.id, grams: x.grams })),
                  })
                }
              >
                Registrar como {meal.toLowerCase()}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
const MEASURES = {
  waist: "Cintura",
  abdomen: "Abdômen",
  chest: "Peito",
  armRight: "Braço direito",
  armLeft: "Braço esquerdo",
  thighRight: "Coxa direita",
  thighLeft: "Coxa esquerda",
  hip: "Quadril",
  neck: "Pescoço",
} as const;
export function Body(p: Props) {
  const { data, open, remove } = p,
    c = composition(data),
    [measure, setMeasure] = useState<keyof typeof MEASURES>("waist"),
    [period, setPeriod] = useState(90),
    [allWeights, setAllWeights] = useState(false);
  // Compares 7-day means a month apart when both exist; single weigh-ins
  // swing too much to call a change.
  const now = weightMean(data.weight_logs),
    before = weightMean(data.weight_logs, shift(today(), -30));
  const sortedW = [...data.weight_logs].sort((a, b) => b.date.localeCompare(a.date));
  const pairs = data.body_metrics
    .map((bf) => ({ bf, w: data.weight_logs.find((x) => x.date === bf.date) }))
    .filter((x) => x.w);
  const kg: Series[] = [
    { name: "Peso", color: "var(--chart-weight)", points: pairs.map((x) => ({ date: x.bf.date, value: x.w!.weight })) },
    {
      name: "Massa magra estimada",
      color: "var(--primary)",
      points: pairs.map((x) => ({ date: x.bf.date, value: x.w!.weight * (1 - x.bf.bf / 100) })),
    },
    {
      name: "Gordura estimada",
      color: "var(--chart-fat)",
      points: pairs.map((x) => ({ date: x.bf.date, value: (x.w!.weight * x.bf.bf) / 100 })),
    },
  ];
  const bfSeries: Series[] = [
    { name: "BF estimado", color: "var(--chart-carb)", points: data.body_metrics.map((x) => ({ date: x.date, value: x.bf })) },
  ];
  const measureSeries: Series[] = [
    {
      name: MEASURES[measure],
      color: "var(--primary)",
      points: data.body_measurements
        .filter((x) => typeof x[measure] === "number")
        .map((x) => ({ date: x.date, value: x[measure] })),
    },
  ];
  const inPeriod = (s: Series[]) => s.some((x) => x.points.some((q) => q.date >= shift(today(), -period)));
  return (
    <>
      <div className="toolbar">
        <Button primary onClick={() => open("Medidas")}>
          <Plus size={16} aria-hidden /> Medidas
        </Button>
        <Button onClick={() => open("BF")}>Registrar BF</Button>
        <Button onClick={() => open("Peso")}>Registrar peso</Button>
      </div>
      <div className="stat-grid">
        <Stat title="BF estimado" value={fmt(c.bf)} unit="%" foot={c.bf != null ? `${c.method} · ${shortDate(c.bfDate!)}` : "Nenhuma estimativa registrada"} />
        <Stat
          title="Massa magra estimada"
          value={fmt(c.lean)}
          unit="kg"
          foot={c.lean != null ? "Inclui água e outros tecidos" : "Precisa de peso e BF na mesma data"}
        />
        <Stat title="Cintura" value={fmt(c.waist)} unit="cm" foot={c.waist != null ? `Medida ${ago(latest(data.body_measurements)!.date)}` : "Sem medida registrada"} />
        <Stat
          title="Variação em 30 dias"
          value={now != null && before != null ? `${now - before > 0 ? "+" : ""}${fmt(now - before)}` : "—"}
          unit="kg"
          foot={now != null && before != null ? "Médias de 7 dias, hoje e há 30 dias" : "Precisa de 3 pesagens em cada semana comparada"}
        />
      </div>
      <div className="card insight">
        <h2>Progresso de composição corporal</h2>
        <p>{assessment(data)}</p>
      </div>
      <section className="card section">
        <div className="card-head">
          <div>
            <h2>Composição ao longo do tempo</h2>
            <small>Só datas com peso e BF registrados juntos</small>
          </div>
          <Periods value={period} onChange={setPeriod} />
        </div>
        {inPeriod(kg) ? (
          <TrendChart series={kg} period={period} unit="kg" title="Peso, massa magra e gordura estimadas" />
        ) : (
          <Empty>Registre BF no mesmo dia de uma pesagem para ver massa magra e gordura estimadas.</Empty>
        )}
        {inPeriod(bfSeries) && <TrendChart series={bfSeries} period={period} unit="%" title="BF estimado" height={170} />}
        <p className="form-note">
          BF aproximado. Massa magra inclui água e outros tecidos; mudanças não comprovam ganho ou perda de músculo.
        </p>
      </section>
      <section className="card section">
        <div className="card-head">
          <h2>Medidas</h2>
          <label className="inline-select">
            <span className="sr-only">Medida</span>
            <select value={measure} onChange={(e) => setMeasure(e.target.value as keyof typeof MEASURES)}>
              {Object.entries(MEASURES).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        {inPeriod(measureSeries) ? (
          <TrendChart series={measureSeries} period={period} unit="cm" title={`${MEASURES[measure]} em cm`} height={180} />
        ) : (
          <Empty>Nenhuma medida de {MEASURES[measure].toLowerCase()} nos últimos {period} dias.</Empty>
        )}
      </section>
      <Photos {...p} />
      <details className="card section">
        <summary>Histórico de peso · {data.weight_logs.length} registros</summary>
        {(allWeights ? sortedW : sortedW.slice(0, 20)).map((x) => (
          <div className="log-row" key={x.id}>
            <span>
              {shortDate(x.date)} <PendingBadge row={x} />
              {x.source && <small className="block">Referência informada</small>}
            </span>
            <strong>{fmt(x.weight)} kg</strong>
            <div className="row-actions">
              <button type="button" className="icon-button" aria-label={`Editar pesagem de ${shortDate(x.date)}`} onClick={() => open("Peso", x)}>
                <Pencil size={16} />
              </button>
              <button
                type="button"
                aria-label={`Excluir pesagem de ${shortDate(x.date)}`}
                className="icon-button"
                onClick={() => remove("weight_logs", x.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {!allWeights && sortedW.length > 20 && (
          <button type="button" className="text-button" onClick={() => setAllWeights(true)}>
            Mostrar todos
          </button>
        )}
      </details>
    </>
  );
}
// Phone photos are 3–8 MB. A 1600 px JPEG keeps the comparison sharp at a
// fraction of the upload, and re-encoding drops EXIF data such as location.
async function shrinkPhoto(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
function Photos({ data, refresh, notice, ask }: Props) {
  const [view, setView] = useState("Frente"),
    [offset, setOffset] = useState(30),
    [busy, setBusy] = useState(false);
  const all = data.progress_photos.filter((x) => x.view === view).sort((a, b) => b.date.localeCompare(a.date)),
    current = all[0],
    past = current ? all.find((x) => x.date <= shift(current.date, -offset)) : null;
  return (
    <section className="card section">
      <div className="card-head">
        <h2>Fotos de evolução</h2>
        <Camera size={20} aria-hidden />
      </div>
      <p>
        Mesmo horário, luz, local e posição. As fotos são privadas, reduzidas no aparelho antes do envio e não geram BF
        automático.
      </p>
      <div className="form-grid section">
        <label>
          Posição
          <select value={view} onChange={(e) => setView(e.target.value)}>
            {["Frente", "Costas", "Perfil esquerdo", "Perfil direito"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Comparar com
          <select value={offset} onChange={(e) => setOffset(Number(e.target.value))}>
            {[30, 60, 90].map((x) => (
              <option value={x} key={x}>
                {x} dias antes
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="photo-grid">
        {[current, past].map((x, i) => (
          <div key={i} className="photo-slot">
            {x ? (
              <>
                {/* Private photo behind auth: served as-is, so no next/image loader. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={"/api/photos?id=" + x.id} alt={`${view}, ${shortDate(x.date)}`} loading="lazy" decoding="async" />
                <small>
                  {i === 0 ? "Mais recente" : "Anterior"} · {shortDate(x.date)}
                </small>
                <button
                  type="button"
                  className="text-button"
                  onClick={async () => {
                    if (
                      !(await ask(
                        "Excluir esta foto?",
                        "Excluir",
                        "O arquivo é apagado do armazenamento privado e não pode ser recuperado.",
                      ))
                    )
                      return;
                    try {
                      const r = await fetch("/api/photos", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: x.id }),
                      });
                      if (!r.ok) throw Error();
                      await refresh();
                      notice("Foto excluída.");
                    } catch {
                      notice("Não foi possível excluir a foto. Excluir precisa de conexão.");
                    }
                  }}
                >
                  Excluir foto
                </button>
              </>
            ) : (
              <>
                <Camera size={30} aria-hidden />
                <p>{i === 0 ? "Sua primeira foto começa aqui" : `Nenhuma foto de ${offset} dias antes da atual`}</p>
              </>
            )}
          </div>
        ))}
      </div>
      <form
        className="toolbar section"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            file = f.get("file");
          if (!(file instanceof File) || !file.size) return notice("Escolha uma foto.");
          setBusy(true);
          try {
            const small = await shrinkPhoto(file);
            f.set("file", small, small === file ? file.name : "foto.jpg");
            f.set("view", view);
            const r = await fetch("/api/photos", { method: "POST", body: f }),
              j = (await r.json().catch(() => ({}))) as { error?: string };
            if (!r.ok) throw Error(j.error ?? "Não foi possível enviar a foto.");
            await refresh();
            (e.target as HTMLFormElement).reset();
            notice(`Foto salva com acesso privado (${fmt(small.size / 1024 / 1024, 1)} MB).`);
          } catch (err) {
            notice(navigator.onLine === false ? "Fotos precisam de conexão. Tente quando estiver online." : message(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Data
          <input type="date" name="date" defaultValue={today()} max={today()} required />
        </label>
        <label>
          Foto JPG, PNG ou WebP
          <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required />
        </label>
        <button disabled={busy} className="button primary">
          {busy ? "Enviando…" : "Salvar foto"}
        </button>
      </form>
    </section>
  );
}
const TRAINING_TABLE: Record<string, Table> = {
  "Jiu-Jitsu": "jiujitsu_sessions",
  Musculação: "gym_sessions",
  Cardio: "cardio_sessions",
};
const scoreText = (label: string, v: unknown) => (typeof v === "number" ? `${label} ${v}/10` : null);
function sessionText(tab: string, x: Row) {
  const parts =
    tab === "Jiu-Jitsu"
      ? [
          x.rounds ? `${x.rounds} rounds × ${x.roundMinutes} min` : "sem sparring",
          `RPE ${x.rpe}`,
          scoreText("performance", x.performance),
          scoreText("fôlego", x.cardio),
          scoreText("força", x.strength),
          scoreText("recuperação", x.recovery),
          x.fatigueAt ? `cansou aos ${x.fatigueAt} min` : null,
          x.hr ? `${x.hr} bpm` : null,
        ]
      : tab === "Cardio"
        ? [x.mode, x.type, x.distance ? `${fmt(x.distance)} km` : null, `RPE ${x.rpe}`, x.hr ? `${x.hr} bpm` : null]
        : [x.notes || null];
  return parts.filter(Boolean).join(" · ");
}
export function Training({ data, open, remove }: Props) {
  const [tab, setTab] = useState("Jiu-Jitsu"),
    [all, setAll] = useState(false),
    bjj = range(data.jiujitsu_sessions, shift(today(), -6)),
    sessions = [...data[TRAINING_TABLE[tab]]].sort(
      (a, b) => b.date.localeCompare(a.date) || String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    );
  // Best load per exercise, then the latest entries.
  const exercises = [...data.gym_exercises].sort((a, b) => b.date.localeCompare(a.date));
  const best = new Map<string, number>();
  for (const x of exercises) {
    const k = String(x.exercise).toLowerCase();
    best.set(k, Math.max(best.get(k) ?? 0, x.load));
  }
  return (
    <>
      <div className="toolbar">
        <div className="tabs" role="group" aria-label="Modalidade">
          {["Jiu-Jitsu", "Musculação", "Cardio"].map((t) => (
            <button
              type="button"
              key={t}
              className={tab === t ? "selected" : ""}
              aria-pressed={tab === t}
              onClick={() => {
                setTab(t);
                setAll(false);
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <Button primary onClick={() => open(tab)}>
          <Plus size={16} aria-hidden /> Registrar {tab}
        </Button>
        {tab === "Musculação" && <Button onClick={() => open("Exercício")}>Adicionar exercício</Button>}
      </div>
      {tab === "Jiu-Jitsu" && (
        <>
          <div className="gas-header">
            <Flame size={22} aria-hidden />
            <h2>Condicionamento no tatame</h2>
            <small>Últimos 7 dias · {bjj.length} {bjj.length === 1 ? "treino" : "treinos"}</small>
          </div>
          <div className="stat-grid">
            <Stat title="Rounds" value={bjj.length ? bjj.reduce((a, x) => a + (x.rounds ?? 0), 0) : "—"} foot="Volume de sparring" />
            <Stat
              title="Tempo de sparring"
              value={bjj.length ? bjj.reduce((a, x) => a + (x.rounds ?? 0) * (x.roundMinutes ?? 0), 0) : "—"}
              unit="min"
              foot="Rounds × duração"
            />
            <Stat title="Performance média" value={fmt(mean(bjj.map((x) => x.performance)))} unit="/10" foot="Nota que você deu" />
            <Stat title="Esforço médio" value={fmt(mean(bjj.map((x) => x.rpe)))} unit="/10" foot="RPE da sessão" />
          </div>
        </>
      )}
      <section className="card">
        <h2>Histórico · {tab}</h2>
        {sessions.length ? (
          <>
            {(all ? sessions : sessions.slice(0, 15)).map((x) => (
              <div className="log-row" key={x.id}>
                <div>
                  <h3>
                    {shortDate(x.date)} · {x.duration} min <PendingBadge row={x} />
                  </h3>
                  <p>{sessionText(tab, x)}</p>
                  {x.techniques && <small>{x.techniques}</small>}
                </div>
                <div className="row-actions">
                  <button type="button" className="icon-button" aria-label="Editar treino" onClick={() => open(tab, x)}>
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Excluir treino"
                    onClick={() => remove(TRAINING_TABLE[tab], x.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {!all && sessions.length > 15 && (
              <button type="button" className="text-button" onClick={() => setAll(true)}>
                Mostrar todos ({sessions.length})
              </button>
            )}
          </>
        ) : (
          <Empty>Registre o treino para acompanhar esforço, desempenho e recuperação.</Empty>
        )}
      </section>
      {tab === "Musculação" && (
        <section className="card section">
          <h2>Cargas, volume e melhores marcas</h2>
          {exercises.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Exercício</th>
                    <th>Carga</th>
                    <th>Séries × reps</th>
                    <th>Volume</th>
                    <th>RIR</th>
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exercises.slice(0, all ? undefined : 30).map((x) => (
                    <tr key={x.id}>
                      <td>
                        {x.exercise}
                        <small className="block">{shortDate(x.date)}</small>
                        {x.load === best.get(String(x.exercise).toLowerCase()) && (
                          <span className="pill">Melhor carga registrada</span>
                        )}
                      </td>
                      <td>{fmt(x.load)} kg</td>
                      <td>
                        {x.sets} × {x.reps}
                      </td>
                      <td>{fmt(x.load * x.reps * x.sets, 0)} kg</td>
                      <td>{x.rir}</td>
                      <td>
                        <button type="button" className="text-button" onClick={() => open("Exercício", x)}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Adicione exercícios com carga, séries, repetições e RIR.</Empty>
          )}
          <p className="form-note">Compare o mesmo exercício em condições semelhantes. Melhor carga não é força máxima estimada.</p>
        </section>
      )}
      <Insights data={data} areas={["Treino"]} title="Leitura dos treinos" />
    </>
  );
}
export function Recovery({ data, open, save }: Props) {
  const c = data.daily_checkins.find((x) => x.date === today()),
    week = range(data.daily_checkins, shift(today(), -6)),
    settings = latest(data.settings),
    [all, setAll] = useState(false),
    water = data.water_logs.filter((x) => x.date === today()).reduce((a, x) => a + x.ml, 0),
    r = readiness(
      c,
      range([...data.jiujitsu_sessions, ...data.cardio_sessions], shift(today(), -1)).reduce(
        (a, x) => a + x.duration * x.rpe,
        0,
      ),
    ),
    steps = week.filter((x) => typeof x.steps === "number"),
    checks = [...data.daily_checkins].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <div className="toolbar">
        <Button primary onClick={() => open("Check-in", c)}>
          <Plus size={16} aria-hidden /> {c ? "Revisar check-in de hoje" : "Check-in de hoje"}
        </Button>
      </div>
      <div className="stat-grid">
        <Stat title="Readiness" value={r ?? "—"} unit="/100" foot={r == null ? "Sem check-in hoje" : "Organização, não diagnóstico"} />
        <Stat title="Sono médio" value={fmt(mean(week.map((x) => x.hours)))} unit="h" foot={`${week.length} de 7 dias registrados`} />
        <Stat
          title="Passos hoje"
          value={typeof c?.steps === "number" ? fmt(c.steps, 0) : "—"}
          foot={steps.length ? `Média de ${fmt(mean(steps.map((x) => x.steps)), 0)} em ${steps.length} dias` : "Não contados nesta semana"}
        />
        <Stat
          title="Água hoje"
          value={water ? fmt(water / 1000) : "—"}
          unit="L"
          foot={`Referência: ${fmt((settings?.water ?? 2500) / 1000)} L`}
        />
      </div>
      <div className="home-grid">
        <section className="card">
          <h2>Hidratação sem exagero</h2>
          <p>Ajuste conforme sede, calor, suor e orientação profissional. Não force água para cumprir uma barra.</p>
          <Meter name="Água registrada" value={water} total={settings?.water ?? 2500} unit="ml" color="var(--chart-carb)" />
          <div className="toolbar">
            <Button onClick={() => save("water_logs", { ml: 250 }, { notice: "+250 ml registrados." })}>
              <Droplets size={17} aria-hidden /> +250 ml
            </Button>
            <Button onClick={() => save("water_logs", { ml: 500 }, { notice: "+500 ml registrados." })}>+500 ml</Button>
          </div>
        </section>
        <section className="card">
          <h2>Sinais da semana</h2>
          <small>Médias de {week.length} check-ins</small>
          {(
            [
              ["Energia", "energy", "maior é melhor"],
              ["Fadiga", "fatigue", "menor é melhor"],
              ["Dor muscular", "soreness", "menor é melhor"],
              ["Estresse", "stress", "menor é melhor"],
              ["Fome", "hunger", ""],
            ] as const
          ).map(([n, k, dir]) => (
            <div className="log-row" key={k}>
              <span>
                {n} {dir && <small>· {dir}</small>}
              </span>
              <strong>{week.length ? `${fmt(mean(week.map((x) => x[k])))}/10` : "—"}</strong>
            </div>
          ))}
        </section>
      </div>
      <Insights data={data} areas={["Recuperação"]} title="Leitura da recuperação" />
      <section className="card">
        <h2>Seus check-ins</h2>
        {checks.length ? (
          <>
            {(all ? checks : checks.slice(0, 14)).map((x) => (
              <div className="log-row" key={x.id}>
                <div>
                  <h3>
                    {shortDate(x.date)} <PendingBadge row={x} />
                  </h3>
                  <p>
                    {fmt(x.hours)} h de sono · energia {x.energy}/10 · fadiga {x.fatigue}/10 · dor {x.soreness}/10
                    {typeof x.steps === "number" ? ` · ${fmt(x.steps, 0)} passos` : ""}
                  </p>
                </div>
                <button type="button" className="icon-button" aria-label={`Editar check-in de ${shortDate(x.date)}`} onClick={() => open("Check-in", x)}>
                  <Pencil size={16} />
                </button>
              </div>
            ))}
            {!all && checks.length > 14 && (
              <button type="button" className="text-button" onClick={() => setAll(true)}>
                Mostrar todos ({checks.length})
              </button>
            )}
          </>
        ) : (
          <Empty>Um minuto por dia para entender sua recuperação.</Empty>
        )}
      </section>
    </>
  );
}
export function Competition({ data, open }: Props) {
  const c = composition(data),
    events = data.competition_events,
    active = events.find((e) => !e.archived),
    w = weightStatus(data.weight_logs);
  return (
    <>
      <div className="toolbar">
        <Button primary onClick={() => open("Campeonato", active)}>
          <Plus size={16} aria-hidden /> {active ? "Editar evento" : "Cadastrar evento"}
        </Button>
        <Button onClick={() => open("Categoria")}>Adicionar categoria</Button>
      </div>
      <div className="card competition-feature">
        <Trophy size={32} aria-hidden />
        <div>
          <h2>{active?.name ?? "Nenhum evento cadastrado"}</h2>
          <p>
            {active
              ? `${shortDate(active.eventDate)} · ${active.category} · ${days(active.eventDate, today())} dias`
              : "Cadastre data, categoria e condições da pesagem quando a organização confirmar. O app não adivinha datas."}
          </p>
        </div>
        <span className="pill">Performance em primeiro lugar</span>
      </div>
      <div className="stat-grid section">
        <Stat
          title="Peso sem kimono"
          value={w.last ? fmt(w.mean ?? c.weight) : "—"}
          unit="kg"
          foot={w.mean != null ? `Média de 7 dias · ${w.week} pesagens` : w.last ? `Última pesagem, ${ago(w.last.date)}` : "Sem pesagem"}
        />
        <Stat
          title="Na condição da pesagem"
          value={active && w.last ? fmt((w.mean ?? c.weight) + (active.withGi ? active.gi : 0)) : "—"}
          unit="kg"
          foot={active ? (active.withGi ? `Com ${fmt(active.gi)} kg de kimono` : "Pesagem sem kimono") : "Informe o evento"}
        />
        <Stat title="Limite da categoria" value={active ? fmt(active.limit) : "—"} unit="kg" foot={active ? active.category : "Defina ao cadastrar o evento"} />
        <Stat title="Sua referência" value={active ? fmt(active.reference) : "—"} unit="kg" foot="Não substitui composição corporal" />
      </div>
      {active && (
        <div className="card">
          <h2>Condições da pesagem</h2>
          <p>
            {shortDate(active.weighDate)} às {active.weighTime} · {active.withGi ? "com" : "sem"} kimono ·{" "}
            {active.fightGap} min até lutar · limite {fmt(active.limit)} kg
          </p>
        </div>
      )}
      <div className="home-grid section">
        <Insights data={data} areas={["Peso", "Evento"]} title="Projeções, não certezas" />
        <section className="card">
          <Shield size={24} className="accent" aria-hidden />
          <h2>Chegue pronto para lutar</h2>
          <p>
            Não use diuréticos, laxantes, vômito, sauna agressiva, restrição extrema de água, jejum prolongado ou
            medicamentos não prescritos para bater peso. Uma categoria compatível com sua condição pode favorecer sua
            performance.
          </p>
        </section>
      </div>
      <section className="card">
        <h2>Categorias para comparar</h2>
        {data.competition_categories.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Limite</th>
                  <th>Você na condição</th>
                  <th>Diferença</th>
                </tr>
              </thead>
              <tbody>
                {data.competition_categories.map((x) => {
                  // With-gi weight needs the kimono weight from a real event.
                  const base = w.mean ?? (w.last ? c.weight : null),
                    current = base == null || (x.withGi && !active) ? null : base + (x.withGi ? active!.gi : 0);
                  return (
                    <tr key={x.id}>
                      <td>
                        {x.name} · {x.withGi ? "com kimono" : "sem kimono"}
                      </td>
                      <td>{fmt(x.limit)} kg</td>
                      <td>{current == null ? "—" : `${fmt(current)} kg`}</td>
                      <td>{current == null ? "Cadastre o evento" : `${current - x.limit > 0 ? "+" : ""}${fmt(current - x.limit)} kg`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Cadastre apenas categorias confirmadas pela organização.</Empty>
        )}
      </section>
      {events.some((e) => e.archived) && (
        <section className="card section">
          <h2>Pós-competição · qual direção seguir?</h2>
          <p>
            Seu evento foi arquivado. Revise peso, BF, fotos, cintura, força, performance e energia. Escolha continuar
            reduzindo gordura, manter, recompor ou iniciar ganho controlado nas configurações. A fase não mudou
            automaticamente.
          </p>
          {events
            .filter((e) => e.archived)
            .map((e) => (
              <p key={e.id}>
                {e.name} · {shortDate(e.eventDate)} · arquivado
              </p>
            ))}
        </section>
      )}
    </>
  );
}
export function Reports({ data }: Props) {
  // The week in progress is computed here from the same rules as the Sunday
  // report, so it is useful before the week closes.
  const live = { ...report(data, today()), id: "live", live: true } as Row,
    list = [live, ...data.weekly_reports.filter((x) => x.date !== today())],
    [selected, setSelected] = useState("live"),
    r = list.find((x) => x.id === selected) ?? live;
  const foodFoot =
    r.mealDays === 0
      ? "Sem refeições registradas"
      : r.completeDays
        ? `Média de ${r.completeDays} ${r.completeDays === 1 ? "dia completo" : "dias completos"}`
        : `${r.mealDays} dias registrados, nenhum fechado: valores parciais`;
  return (
    <>
      <label className="section week-select">
        Semana
        <select value={r.id} onChange={(e) => setSelected(e.target.value)}>
          {list.map((x) => (
            <option value={x.id} key={x.id}>
              {x.live ? `Últimos 7 dias (${shortDate(x.start)} a hoje)` : `${shortDate(x.start)} a ${shortDate(x.date)}`}
            </option>
          ))}
        </select>
      </label>
      <div className="stat-grid section">
        <Stat
          title="Peso médio"
          value={fmt(r.weight)}
          unit="kg"
          foot={
            r.weight != null && r.previousWeight != null
              ? `${r.weight - r.previousWeight > 0 ? "+" : ""}${fmt(r.weight - r.previousWeight)} kg contra a semana anterior`
              : r.weighIns != null
                ? `${r.weighIns} de 3 pesagens para a média`
                : "Sem semana anterior para comparar"
          }
        />
        <Stat title="Proteína média" value={fmt(r.protein, 0)} unit="g" foot={foodFoot} />
        <Stat
          title="Sono médio"
          value={fmt(r.sleep)}
          unit="h"
          foot={r.checkins != null ? `${r.checkins} ${r.checkins === 1 ? "check-in" : "check-ins"}` : "Dias registrados"}
        />
        <Stat title="Consistência" value={r.consistency} unit="%" foot="Peso, refeições e check-ins registrados" />
      </div>
      <div className="home-grid">
        <section className="card">
          <h2>Alimentação e composição</h2>
          {(
            [
              ["Calorias", r.calories, "kcal", 0],
              ["Carboidratos", r.carbs, "g", 0],
              ["Gorduras", r.fat, "g", 0],
              ["Cintura", r.waist, "cm", 1],
              ["BF aproximado", r.bf, "%", 1],
              ["Massa magra estimada", r.lean, "kg", 1],
            ] as const
          ).map(([k, v, unit, d]) => (
            <div className="log-row" key={k}>
              <span>{k}</span>
              <strong>{v == null ? "—" : `${fmt(v, d)} ${unit}`}</strong>
            </div>
          ))}
          <small>{foodFoot}</small>
        </section>
        <section className="card">
          <h2>Treino e recuperação</h2>
          {(
            [
              ["Jiu-Jitsu", `${r.bjj} ${r.bjj === 1 ? "sessão" : "sessões"}`],
              ["Musculação", `${r.gym} ${r.gym === 1 ? "sessão" : "sessões"}`],
              ["Cardio", `${r.cardio} ${r.cardio === 1 ? "sessão" : "sessões"}`],
              ["Performance no tatame", r.bjjPerformance == null ? "—" : `${fmt(r.bjjPerformance)}/10`],
              ["Fôlego no Jiu-Jitsu", r.cardioScore == null ? "—" : `${fmt(r.cardioScore)}/10`],
              ["Energia", r.energy == null ? "—" : `${fmt(r.energy)}/10`],
              ["Fome", r.hunger == null ? "—" : `${fmt(r.hunger)}/10`],
              ["Estresse", r.stress == null ? "—" : `${fmt(r.stress)}/10`],
            ] as const
          ).map(([k, v]) => (
            <div className="log-row" key={k}>
              <span>{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </section>
      </div>
      <div className="card insight">
        <h2>Leitura da semana</h2>
        <p>{r.conclusion}</p>
        <p>
          {r.live
            ? "Semana em andamento: os números mudam conforme você registra. O relatório fechado é salvo a cada domingo, ao abrir o app."
            : "Relatório salvo ao abrir o app depois do domingo."}{" "}
          Consistência descreve registros, não o seu valor ou disciplina.
        </p>
      </div>
    </>
  );
}
type ChatRow = Row & { message: string; response: string; mode: string; fallback?: string };
export function Assistant(p: Props) {
  const { data, refresh, notice } = p,
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState<{ mode: string; available: boolean; model?: string } | null>(null),
    [live, setLive] = useState<{ message: string; response: string } | null>(null),
    end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json() as Promise<{ mode: string; available: boolean; model?: string }>)
      .then(setStatus)
      .catch(() => setStatus({ mode: "offline", available: false }));
  }, []);
  const history = [...data.ai_conversations]
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    .slice(-20) as ChatRow[];
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [history.length, live?.response]);
  async function send(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setLive({ message: question, response: "" });
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, stream: true }),
      });
      if (!r.ok) throw Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "O assistente não respondeu.");
      if (r.headers.get("content-type")?.includes("ndjson") && r.body) {
        // The reply arrives line by line while the model writes it.
        const reader = r.body.getReader(),
          decoder = new TextDecoder();
        let buffer = "",
          shown = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines.filter(Boolean)) {
            const piece = JSON.parse(line) as { t?: string; row?: ChatRow; error?: string };
            if (piece.t) {
              shown += piece.t;
              setLive({ message: question, response: shown });
            }
            if (piece.error) throw Error(piece.error);
            if (piece.row?.fallback) notice(`Ollama indisponível: ${piece.row.fallback} Resposta do modo básico.`);
          }
        }
      }
      setText("");
      await refresh();
    } catch (e) {
      notice(navigator.onLine === false ? "O assistente precisa de conexão." : message(e));
    } finally {
      setLive(null);
      setBusy(false);
    }
  }
  const pill =
    status == null
      ? "Verificando o assistente…"
      : status.mode === "ollama"
        ? status.available
          ? `Ollama · ${status.model} no seu computador`
          : "Ollama configurado, mas desligado"
        : status.mode === "ai"
          ? "IA configurada"
          : status.mode === "offline"
            ? "Sem conexão"
            : "Modo básico · regras com seus registros";
  return (
    <>
      <section className="card assistant-intro">
        <Sparkles size={26} className="accent" aria-hidden />
        <h2>Contexto para decidir melhor</h2>
        <p>
          O assistente lê um resumo dos seus registros (perfil, metas, peso, alimentação, treinos e recuperação, com
          período e quantidade de dados) antes de responder.
        </p>
        <span className={"pill" + (status?.mode === "ollama" && !status.available ? " warn" : "")}>{pill}</span>
        {status?.mode === "ollama" && !status.available && (
          <p>
            Ligue o Ollama no computador para respostas do modelo. Até lá, as respostas vêm do modo básico e aparecem
            marcadas assim.
          </p>
        )}
        {status?.mode === "basic" && (
          <p>
            Nenhuma IA configurada. O modo básico responde por regras sobre os temas abaixo; não entende toda conversa
            livre.
          </p>
        )}
      </section>
      <section className="card section">
        <h2>O que faço agora?</h2>
        <p style={{ whiteSpace: "pre-line" }}>{nextStep(data)}</p>
      </section>
      <Insights data={data} />
      <div className="prompt-grid">
        {["O que eu almoço?", "Meu peso subiu hoje.", "Estou cansando muito no treino.", "Posso comer hambúrguer?"].map(
          (q) => (
            <button type="button" disabled={busy} key={q} onClick={() => send(q)}>
              {q}
              <ArrowUpRight size={16} aria-hidden />
            </button>
          ),
        )}
      </div>
      <div className="chat-history" role="log" aria-label="Conversa com o assistente" aria-live="polite" tabIndex={0}>
        {history.map((x) => (
          <div key={x.id}>
            <div className="message user">{x.message}</div>
            <div className="message assistant">
              <span className="accent">
                <Sparkles size={16} aria-hidden /> {x.mode === "ollama" ? "Ollama local" : x.mode === "ai" ? "IA" : "Modo básico"}
                {x.fallback && " · Ollama indisponível"}
                {typeof x.ms === "number" && ` · ${fmt(x.ms / 1000, 1)} s`}
              </span>
              <p>{x.response}</p>
            </div>
          </div>
        ))}
        {live && (
          <div>
            <div className="message user">{live.message}</div>
            <div className="message assistant">
              <span className="accent">
                <Sparkles size={16} aria-hidden /> {live.response ? "Escrevendo…" : "Lendo seus registros…"}
              </span>
              {live.response && <p>{live.response}</p>}
            </div>
          </div>
        )}
        <div ref={end} />
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          aria-label="Mensagem ao assistente"
          placeholder="Escreva o que está acontecendo no seu dia…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          enterKeyHint="send"
        />
        <button disabled={busy || !text.trim()} className="button primary" aria-label="Enviar mensagem">
          <Send size={18} />
        </button>
      </form>
    </>
  );
}
const FAQ = [
  [
    "Como instalar no iPhone?",
    "Abra o endereço publicado no Safari, toque em Compartilhar e em Adicionar à Tela de Início.",
  ],
  [
    "O que funciona sem internet?",
    "Depois de abrir o app conectado uma vez, peso, refeições, treinos, medidas, check-ins e água ficam salvos neste aparelho e sincronizam quando a conexão volta. Registros ainda não enviados aparecem marcados “no aparelho”. Fotos, chat e exclusões exigem conexão.",
  ],
  [
    "O que é “fechar o dia”?",
    "É você dizendo que registrou tudo o que comeu naquele dia. Só dias fechados entram nas médias de alimentação, porque um dia parcial subestima o que você comeu.",
  ],
  [
    "Como o readiness é calculado?",
    "É uma heurística de sono, energia, fadiga, dor, estresse e carga recente, não um instrumento clínico validado.",
  ],
  [
    "O BF estimado é preciso?",
    "Não. O BF por circunferências usa a fórmula US Navy, com erro individual relevante. Trate como tendência, não como medição.",
  ],
  [
    "De onde vêm os valores dos alimentos e das calorias?",
    "Os alimentos iniciais são aproximados e editáveis. A contagem de calorias não mede com precisão o seu gasto.",
  ],
  [
    "O que ainda não existe no app?",
    "Integração com Apple Health (passos são manuais), leitura de foto da comida, BF por foto, sincronização com relógios e notificações em segundo plano.",
  ],
] as const;
const SOURCES = [
  ["ISSN · proteína e exercício", "https://link.springer.com/article/10.1186/s12970-017-0177-8"],
  [
    "AIS · categorias de peso e performance",
    "https://www.ausport.gov.au/ais/position_statements/making-weight-in-weight-category-sports",
  ],
] as const;
const WEEK = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
// Tables a backup can bring back. Derived rows (meal items, sleep logs,
// reports, chat, photo metadata) are rebuilt or stay with the server.
const IMPORTABLE = TABLES.filter(
  (t) => schemas[t] && !["progress_photos"].includes(t),
);
const VOLATILE = new Set(["createdAt", "_mutationId", "_pending"]);
// What makes two versions of a record "the same" for import purposes.
function comparable(table: Table, row: Row) {
  const clean = Object.fromEntries(Object.entries(row).filter(([k]) => !VOLATILE.has(k)));
  if (table === "meals")
    return JSON.stringify({
      ...Object.fromEntries(Object.entries(clean).filter(([k]) => ["date", "name", "time"].includes(k))),
      items: (row.items ?? []).map((i: Row) => [i.foodId, i.grams]),
    });
  return JSON.stringify(Object.keys(clean).sort().map((k) => [k, clean[k]]));
}
type Preview = {
  file: string;
  exportedAt?: string;
  rows: { table: Table; data: Row; status: "novo" | "diferente" | "igual" | "inválido" }[];
};
function readBackup(text: string, name: string, data: Data): Preview {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw Error("O arquivo não é um JSON válido.");
  }
  const body = parsed as { version?: number; exportedAt?: string; data?: Record<string, unknown> };
  if (body?.version !== 1 || typeof body.data !== "object" || !body.data)
    throw Error("Este arquivo não é um backup do BODY OS (versão 1).");
  const rows: Preview["rows"] = [];
  for (const table of IMPORTABLE) {
    const list = body.data[table];
    if (!Array.isArray(list)) continue;
    for (const raw of list.slice(0, 20000)) {
      const result = schemas[table]!.safeParse(raw);
      if (!result.success || typeof raw !== "object" || !raw) {
        rows.push({ table, data: raw as Row, status: "inválido" });
        continue;
      }
      const row = { ...(raw as Row), ...result.data } as Row;
      const id = canonicalId(table, row);
      const current = data[table].find((x) => x.id === id);
      rows.push({
        table,
        data: { ...row, id },
        status: !current ? "novo" : comparable(table, current) === comparable(table, row) ? "igual" : "diferente",
      });
    }
  }
  return { file: name, exportedAt: body.exportedAt, rows };
}
const TABLE_NAMES: Partial<Record<Table, string>> = {
  users: "Perfil",
  goals: "Objetivos",
  weight_logs: "Pesagens",
  body_measurements: "Medidas",
  body_metrics: "BF",
  foods: "Alimentos",
  meals: "Refeições",
  nutrition_targets: "Metas",
  nutrition_days: "Dias fechados",
  jiujitsu_sessions: "Jiu-Jitsu",
  gym_sessions: "Musculação",
  gym_exercises: "Exercícios",
  cardio_sessions: "Cardio",
  daily_checkins: "Check-ins",
  water_logs: "Água",
  competition_events: "Eventos",
  competition_categories: "Categorias",
  settings: "Configurações",
};
function DataPortability({ data, notice, importRows, pending }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null),
    [replace, setReplace] = useState(false),
    [busy, setBusy] = useState(false);
  async function exportAll() {
    setBusy(true);
    try {
      // The full history comes from the server; the screen copy is trimmed.
      let full: Data = data;
      try {
        const r = await fetch("/api/data?scope=all", { cache: "no-store" });
        if (r.ok) full = { ...(await r.json()) };
      } catch {
        notice("Sem conexão: o backup usa a cópia deste aparelho, que pode não ter o histórico completo do chat.");
      }
      const blob = new Blob(
          [
            JSON.stringify(
              {
                version: 1,
                exportedAt: new Date().toISOString(),
                pendingOnDevice: pending,
                data: full,
              },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "body-os-backup-" + today() + ".json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notice("Backup exportado. Guarde-o em um local privado.");
    } finally {
      setBusy(false);
    }
  }
  const counts = (status: Preview["rows"][number]["status"]) => preview?.rows.filter((r) => r.status === status).length ?? 0;
  const toApply = preview?.rows.filter((r) => r.status === "novo" || (replace && r.status === "diferente")) ?? [];
  const byTable = new Map<Table, Record<string, number>>();
  for (const r of preview?.rows ?? []) {
    const entry = byTable.get(r.table) ?? {};
    entry[r.status] = (entry[r.status] ?? 0) + 1;
    byTable.set(r.table, entry);
  }
  return (
    <section className="card section">
      <h2>Backup e recuperação</h2>
      <p>
        O backup inclui todos os registros e metadados, mas não os arquivos das fotos. Para restaurar, escolha um backup:
        o app mostra o que muda antes de gravar qualquer coisa, e nada é apagado.
      </p>
      <div className="toolbar">
        <Button onClick={exportAll} disabled={busy}>
          <Download size={17} aria-hidden /> Exportar meus registros
        </Button>
        <label className="button file-button">
          <Upload size={17} aria-hidden /> Restaurar de um backup
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                if (file.size > 20_000_000) throw Error("Arquivo grande demais para um backup do BODY OS.");
                setPreview(readBackup(await file.text(), file.name, data));
                setReplace(false);
              } catch (err) {
                setPreview(null);
                notice(message(err));
              }
            }}
          />
        </label>
      </div>
      {preview && (
        <div className="import-preview" role="region" aria-label="Prévia da restauração">
          <h3>
            {preview.file}
            {preview.exportedAt && <small> · exportado em {shortDate(preview.exportedAt.slice(0, 10))}</small>}
          </h3>
          <p>
            {counts("novo")} novos · {counts("diferente")} diferentes do que está no app · {counts("igual")} iguais
            {counts("inválido") ? ` · ${counts("inválido")} inválidos (serão ignorados)` : ""}
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Novos</th>
                  <th>Diferentes</th>
                  <th>Iguais</th>
                  <th>Inválidos</th>
                </tr>
              </thead>
              <tbody>
                {[...byTable].map(([t, c]) => (
                  <tr key={t}>
                    <td>{TABLE_NAMES[t] ?? t}</td>
                    <td>{c.novo ?? 0}</td>
                    <td>{c.diferente ?? 0}</td>
                    <td>{c.igual ?? 0}</td>
                    <td>{c["inválido"] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {counts("diferente") > 0 && (
            <label className="check">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              Substituir também os {counts("diferente")} registros diferentes pela versão do arquivo
            </label>
          )}
          <div className="toolbar">
            <Button
              primary
              disabled={!toApply.length || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await importRows(toApply.map(({ table, data }) => ({ table, data })));
                  setPreview(null);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {toApply.length ? `Restaurar ${toApply.length} registros` : "Nada a restaurar"}
            </Button>
            <Button onClick={() => setPreview(null)}>Cancelar</Button>
          </div>
        </div>
      )}
    </section>
  );
}
export function SettingsView(p: Props) {
  const { data, save, open } = p,
    me = profile(data),
    user = latest(data.users),
    suggestion = phaseSuggestion(data),
    level = ["principal", "esportivo", "temporário"],
    goals = [...data.goals].sort(
      (a, b) => Number(b.active) - Number(a.active) || level.indexOf(a.type) - level.indexOf(b.type),
    );
  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Seu perfil</h2>
            <small>Usado nas metas iniciais, no BF por medidas e nos horários</small>
          </div>
          <Button onClick={() => open("Perfil", user)}>
            <Pencil size={16} aria-hidden /> Editar
          </Button>
        </div>
        <dl className="profile-facts">
          <div>
            <dt>Idade</dt>
            <dd>{me.age != null ? `${me.age} anos` : "—"}</dd>
          </div>
          <div>
            <dt>Altura</dt>
            <dd>{me.height != null ? `${me.height} cm` : "—"}</dd>
          </div>
          <div>
            <dt>Jiu-Jitsu</dt>
            <dd>
              {me.bjjDays.length ? me.bjjDays.map((d) => WEEK[d]).join(", ") : "—"}
              {me.bjjTime ? ` · ${hour(me.bjjTime)}` : ""}
            </dd>
          </div>
          <div>
            <dt>Musculação</dt>
            <dd>{me.gymTime ? hour(me.gymTime) : "—"}</dd>
          </div>
          <div>
            <dt>Lactose</dt>
            <dd>{user?.lactoseIntolerant ? "Intolerante" : "Sem restrição"}</dd>
          </div>
        </dl>
      </section>
      <section className="card section">
        <h2>Fase e preferências</h2>
        <p>
          Sugestão do app: {suggestion.phase}. {suggestion.reason} A escolha é sua; nada muda sem você salvar.
        </p>
        <div className="section">
          <RecordForm kind="Configurações" data={data} save={save} busy={false} />
        </div>
      </section>
      <section className="card section">
        <div className="card-head">
          <h2>Objetivos</h2>
          <Button onClick={() => open("Objetivo")}>
            <Plus size={16} aria-hidden /> Novo
          </Button>
        </div>
        {goals.map((g) => (
          <div className={"log-row" + (g.active ? "" : " inactive")} key={g.id}>
            <div>
              <span className="pill">{g.type}</span> {!g.active && <small>· inativo</small>}
              <p>{g.title}</p>
            </div>
            <button type="button" className="icon-button" aria-label={`Editar objetivo: ${g.title}`} onClick={() => open("Objetivo", g)}>
              <Pencil size={16} />
            </button>
          </div>
        ))}
      </section>
      <DataPortability {...p} />
      <section className="card section">
        <h2>Privacidade</h2>
        <p>
          Registros ficam no banco privado e uma cópia local permite uso offline. Use um aparelho protegido por senha.
          Limpar os dados do navegador apaga registros ainda não sincronizados. Fotos têm acesso autenticado. Quando a IA
          está ativa, ela recebe um resumo em texto dos registros; fotos não são enviadas.
        </p>
      </section>
      <section className="card section">
        <h2>Perguntas frequentes</h2>
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <ChevronRight size={16} aria-hidden />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <h3 className="sources-title">Referências usadas nas metas</h3>
        <ul className="sources">
          {SOURCES.map(([label, href]) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noreferrer">
                {label} <ArrowUpRight size={14} aria-hidden />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
