"use client";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Download,
  Droplets,
  Dumbbell,
  Flame,
  Heart,
  Plus,
  Scale,
  Send,
  Shield,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Utensils,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Data,
  Draft,
  Row,
  Table,
  today,
  shift,
  days,
  fmt,
  mean,
  latest,
  range,
  composition,
  weightMean,
  weightTrend,
  readiness,
  targets,
  macros,
  assessment,
  calorieReview,
  mealIdea,
  mealPlan,
  slotAt,
  nowTime,
  profile,
  trainsToday,
  hour,
} from "@/lib/body";
import { delivery } from "@/lib/coach";
import { nextStep, phaseSuggestion } from "@/lib/decisions";
import { RecordForm, Save } from "./forms";
export type ViewProps = Props;
type MealItem = { name?: string; grams?: number };
type Props = {
  data: Data;
  open: (kind: string, row?: Draft) => void;
  save: Save;
  refresh: () => Promise<void>;
  notice: (s: string) => void;
  go: (s: string) => void;
  remove: (table: Table, id: string) => void;
  ask: (question: string, action?: string, detail?: string) => Promise<boolean>;
};
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
  const missing = value === "—";
  return (
    <div className="stat card">
      <div className="stat-title">
        {title}
        {icon}
      </div>
      <div className={"stat-value" + (missing ? " missing" : "")}>
        {value}
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
      <Activity size={24} />
      <p>{children}</p>
    </div>
  );
}
function Button({
  children,
  onClick,
  primary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={"button " + (primary ? "primary" : "")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Meter({
  name,
  value,
  total,
  color = "var(--primary)",
  unit = "g",
}: {
  name: string;
  value: number;
  total: number;
  color?: string;
  unit?: string;
}) {
  return (
    <div className="meter">
      <div>
        <span>{name}</span>
        <strong>
          {fmt(value, 0)}{" "}
          <small>
            / {fmt(total, 0)} {unit}
          </small>
        </strong>
      </div>
      <div className="track">
        <i
          style={{
            transform: `scaleX(${total ? Math.min(1, value / total) : 0})`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}
export function Chart({
  data,
  measure = "weight",
  fill = false,
}: {
  data: Data;
  measure?: string;
  // Grow to the height of the card beside it instead of a fixed height.
  fill?: boolean;
}) {
  const [period, setPeriod] = useState(30);
  const dates = [
    ...new Set(
      [
        ...data.weight_logs,
        ...data.body_metrics,
        ...data.body_measurements,
      ].map((x) => x.date),
    ),
  ]
    .filter((d) => d >= shift(today(), -period) && d <= today())
    .sort();
  const points = dates.map((d) => {
    const w = data.weight_logs.find((x) => x.date === d),
      bf = data.body_metrics.find((x) => x.date === d),
      m = data.body_measurements.find((x) => x.date === d);
    return {
      date: d,
      label: d.slice(8) + "/" + d.slice(5, 7),
      weight: w?.weight,
      average: weightMean(data.weight_logs, d),
      bf: bf?.bf,
      lean: w && bf ? w.weight * (1 - bf.bf / 100) : undefined,
      fat: w && bf ? (w.weight * bf.bf) / 100 : undefined,
      ...m,
    };
  });
  return (
    <>
      <div className="card-head">
        <div>
          <h2>
            {measure === "weight"
              ? "Evolução corporal"
              : measure === "composition"
                ? "Composição ao longo do tempo"
                : "Evolução das medidas"}
          </h2>
          <small>
            {measure === "weight"
              ? "Peso diário e média móvel de 7 dias"
              : "Estimativas e medições registradas"}
          </small>
        </div>
        <div className="tabs small-tabs" role="group" aria-label="Período">
          {[30, 60, 90].map((n) => (
            <button
              key={n}
              className={period === n ? "selected" : ""}
              aria-pressed={period === n}
              aria-label={`Últimos ${n} dias`}
              onClick={() => setPeriod(n)}
            >
              {n}d
            </button>
          ))}
        </div>
      </div>
      {points.length === 0 ? (
        <Empty>Seus gráficos começam com os primeiros registros.</Empty>
      ) : (
        <div
          className="chart"
          style={fill ? { flex: 1, minHeight: 240 } : { height: 260 }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 600, height: 260 }}
          >
            <LineChart
              data={points}
              margin={{ top: 12, right: 10, left: -18, bottom: 5 }}
            >
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="3 5"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="kg"
                domain={["auto", "auto"]}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              {measure === "composition" && (
                <YAxis
                  yAxisId="bf"
                  orientation="right"
                  unit="%"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
              )}
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
                formatter={(v) => fmt(Number(v))}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              {measure === "weight" ? (
                <>
                  <Line
                    name="Peso (kg)"
                    yAxisId="kg"
                    dataKey="weight"
                    stroke="#7b8d77"
                    strokeWidth={1.5}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  <Line
                    name="Média 7 dias (kg)"
                    yAxisId="kg"
                    dataKey="average"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </>
              ) : measure === "composition" ? (
                <>
                  <Line
                    name="Peso (kg)"
                    yAxisId="kg"
                    dataKey="weight"
                    stroke="#8da38a"
                  />
                  <Line
                    name="Massa magra (kg)"
                    yAxisId="kg"
                    dataKey="lean"
                    stroke="var(--primary)"
                  />
                  <Line
                    name="Gordura (kg)"
                    yAxisId="kg"
                    dataKey="fat"
                    stroke="#efa26b"
                  />
                  <Line
                    name="BF (%)"
                    yAxisId="bf"
                    dataKey="bf"
                    stroke="#84b9db"
                  />
                </>
              ) : (
                <Line
                  name="Medida (cm)"
                  yAxisId="kg"
                  dataKey={measure}
                  stroke="var(--primary)"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {points.length === 1 && (
        <small>
          Primeiro registro. A tendência aparecerá conforme você registrar mais
          dias.
        </small>
      )}
    </>
  );
}
// The one thing to log next, in the order the day happens:
// morning weigh-in, recovery check-in, then the next planned meal.
function TodayAction({ data, open, go }: Props) {
  const plan = mealPlan(data),
    me = profile(data),
    weighed = data.weight_logs.some((x) => x.date === today()),
    checked = data.daily_checkins.some((x) => x.date === today()),
    next = plan.next,
    meals = plan.slots.filter((s) => s.done).length,
    bjj = trainsToday(data) && me.bjjTime ? hour(me.bjjTime) : null;
  const step = !weighed
    ? {
        Icon: Scale,
        title: "Registre a pesagem da manhã",
        body: "Em jejum, depois do banheiro e sem kimono. A média de 7 dias aparece a partir de 3 pesagens na semana.",
        label: "Registrar peso",
        act: () => open("Peso"),
      }
    : !checked
      ? {
          Icon: Heart,
          title: "Faça o check-in de hoje",
          body: "Sono, energia, fadiga, dor e estresse. Leva um minuto e alimenta a leitura de recuperação.",
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
        : {
            Icon: Check,
            title: "Registros do dia completos",
            body: "Pesagem, check-in e refeições do plano estão registrados. Se treinar, registre a sessão para acompanhar carga e recuperação.",
            label: "Registrar treino",
            act: () => open("Treino"),
          };
  const checklist: [string, boolean][] = [
    ["Pesagem", weighed],
    ["Check-in", checked],
    [`Refeições ${meals}/${plan.slots.length}`, !next],
  ];
  return (
    <section className="card today-card" aria-labelledby="today-title">
      <span className="today-icon">
        <step.Icon size={22} />
      </span>
      <div className="today-body">
        <small>Próximo registro</small>
        <h2 id="today-title">{step.title}</h2>
        <p>{step.body}</p>
        <ul className="day-checklist" aria-label="Registros de hoje">
          {checklist.map(([label, done]) => (
            <li key={label} className={done ? "done" : ""}>
              {done ? <Check size={14} /> : <span aria-hidden />}
              {label}
              <span className="sr-only">{done ? " feito" : " pendente"}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="today-actions">
        <button className="button primary" onClick={step.act}>
          <Plus size={17} /> {step.label}
        </button>
        <button className="text-button" onClick={() => go("Assistente")}>
          Orientação do dia <ChevronRight size={15} />
        </button>
      </div>
    </section>
  );
}
export function Overview(p: Props) {
  const { data, open, go } = p,
    c = composition(data),
    t = targets(data),
    m = macros(data.meals.filter((x) => x.date === today())),
    check = data.daily_checkins.find((x) => x.date === today()),
    recent = range(
      [...data.jiujitsu_sessions, ...data.cardio_sessions],
      shift(today(), -1),
    ).reduce((a, x) => a + x.duration * x.rpe, 0),
    r = readiness(check, recent),
    event = data.competition_events.find(
      (e) => !e.archived && e.eventDate >= today(),
    ),
    me = profile(data),
    bjj = trainsToday(data),
    lastWeight = latest(data.weight_logs),
    week = range(data.weight_logs, shift(today(), -6)).length,
    planned = mealPlan(data).next,
    loggedMeals = data.meals.some((x) => x.date === today());
  return (
    <>
      <TodayAction {...p} />
      <div className="stat-grid">
        <Stat
          title="Peso atual"
          value={lastWeight ? fmt(lastWeight.weight) : "—"}
          unit="kg"
          foot={
            !lastWeight
              ? "Nenhuma pesagem registrada"
              : lastWeight.source
                ? "Referência inicial informada"
                : "Sem kimono · " + shortDate(lastWeight.date)
          }
          icon={<Scale />}
        />
        <Stat
          title="Média de 7 dias"
          value={week >= 3 ? fmt(weightMean(data.weight_logs)) : "—"}
          unit="kg"
          foot={
            week >= 3
              ? `${week} pesagens nos últimos 7 dias`
              : `${week} de 3 pesagens para calcular`
          }
          icon={<Activity />}
        />
        <Stat
          title="Gordura corporal"
          value={fmt(c.bf)}
          unit="%"
          foot={c.bf == null ? "Sem medição registrada" : "Estimativa, não medição exata"}
          icon={<Target />}
        />
        <Stat
          title="Cintura"
          value={fmt(c.waist)}
          unit="cm"
          foot={c.waist == null ? "Sem medida registrada" : "Última medida"}
          icon={<BarChart3 />}
        />
      </div>
      <div className="home-grid">
        <section className="card chart-card">
          <Chart data={data} fill />
        </section>
        <section className="card nutrition-card">
            <div className="card-head">
              <h2>Alimentação de hoje</h2>
              <Utensils size={18} className="accent" />
            </div>
            <div
              className="calorie-ring"
              style={
                {
                  "--progress":
                    Math.min(100, (m.calories / t.calories) * 100) + "%",
                } as CSSProperties
              }
            >
              {loggedMeals ? (
                <div>
                  <strong>
                    {fmt(Math.max(0, t.calories - m.calories), 0)}
                  </strong>
                  <small>kcal restantes</small>
                </div>
              ) : (
                <div>
                  <strong>{fmt(t.calories, 0)}</strong>
                  <small>kcal de meta</small>
                  <small>sem registro hoje</small>
                </div>
              )}
            </div>
            <Meter name="Proteína" value={m.protein} total={t.protein} />
            <Meter
              name="Carboidratos"
              value={m.carbs}
              total={t.carbs}
              color="#84b9db"
            />
            <Meter
              name="Gorduras"
              value={m.fat}
              total={t.fat}
              color="#efa26b"
            />
            <p className="insight">
              {planned
                ? `Próxima: ${planned.name} por volta das ${planned.time} · ~${fmt(
                    planned.target.calories,
                    0,
                  )} kcal e ${fmt(planned.target.protein, 0)} g de proteína.`
                : "Todas as refeições do plano já têm registro hoje."}
            </p>
            <Button onClick={() => open("Refeição")}>
              <Plus size={16} /> Registrar refeição
            </Button>
          </section>
      </div>
      <div className="bottom-grid">
        <section className="card">
          <div className="card-head">
            <h2>Treino de hoje</h2>
            <Dumbbell size={18} />
          </div>
          <div className="training-title">
            <span className="tile-icon">
              <Dumbbell />
            </span>
            <div>
              <h3>{bjj ? "Jiu-Jitsu" : "Sem Jiu-Jitsu hoje"}</h3>
              <p>
                {bjj
                  ? me.bjjTime
                    ? `Hoje às ${hour(me.bjjTime)}`
                    : "Horário não configurado"
                  : me.gymTime
                    ? `Musculação às ${hour(me.gymTime)}, se for seu dia`
                    : me.bjjDays.length
                      ? "Dia livre na sua rotina"
                      : "Dias de treino não configurados"}
              </p>
            </div>
          </div>
          <button className="text-button" onClick={() => open("Treino")}>
            Registrar treino <ChevronRight size={15} />
          </button>
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Sua recuperação</h2>
            <Heart size={18} />
          </div>
          <div className="readiness">
            <strong>
              {r ?? "—"}
              {r != null && <small>/100</small>}
            </strong>
            <span className="pill">
              {r == null
                ? "Faça seu check-in"
                : r >= 75
                  ? "Boa recuperação"
                  : r >= 50
                    ? "Observe os sinais"
                    : "Priorize recuperar"}
            </span>
          </div>
          <button className="text-button" onClick={() => open("Check-in")}>
            Check-in diário <ChevronRight size={15} />
          </button>
        </section>
        <section className="card competition-mini">
          <div className="card-head">
            <h2>Próximo campeonato</h2>
            <Trophy size={18} />
          </div>
          <div className="readiness">
            <strong>
              {event ? days(event.eventDate, today()) : "—"}
              {event && <small>dias</small>}
            </strong>
          </div>
          <p>{event ? event.name : "Nenhum evento cadastrado"}</p>
          <button className="text-button" onClick={() => go("Campeonato")}>
            {event ? "Ver preparação" : "Cadastrar evento"}{" "}
            <ChevronRight size={15} />
          </button>
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
          <button key={label} onClick={() => open(label)}>
            <Icon size={16} />
            {label}
            <Plus size={14} />
          </button>
        ))}
      </div>
    </>
  );
}
export function DayPlan({
  data,
  open,
  date = today(),
}: Props & { date?: string }) {
  const plan = mealPlan(data, date),
    isToday = date === today();
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Plano de refeições</h2>
          <small>
            {isToday ? "Horários sugeridos para hoje" : shortDate(date)}
          </small>
        </div>
        <Clock size={18} className="accent" />
      </div>
      {plan.slots.map((s) => (
        <div className="log-row" key={s.name}>
          <div>
            <h3>
              {s.time} · {s.name}{" "}
              <small>{s.done ? "registrado" : "pendente"}</small>
            </h3>
            <p>
              {s.done
                ? s.meals
                    .map(
                      (x) =>
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
                ? `${fmt(s.logged.calories, 0)} kcal · ${fmt(
                    s.logged.protein,
                    0,
                  )} g proteína · meta ~${fmt(s.target.calories, 0)} kcal`
                : `Meta: ~${fmt(s.target.calories, 0)} kcal · ${fmt(
                    s.target.protein,
                    0,
                  )} g proteína`}
            </small>
          </div>
          <button
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
        {plan.next
          ? `Próxima refeição pendente: ${plan.next.name}, por volta das ${plan.next.time}.`
          : "Todas as refeições do plano têm registro neste dia."}{" "}
        {plan.remaining > 0
          ? `Faltam ${fmt(plan.remaining, 0)} kcal para a meta do dia.`
          : `Você já passou ${fmt(-plan.remaining, 0)} kcal da meta do dia.`}{" "}
        Horários e divisão são sugestões de rotina, não regras: o que conta é o
        total do dia e a proteína.
      </p>
    </section>
  );
}
export function Nutrition(p: Props) {
  const { data, open, remove } = p,
    [date, setDate] = useState(today()),
    t = targets(data),
    meals = data.meals.filter((x) => x.date === date),
    m = macros(meals);
  return (
    <>
      <div className="toolbar">
        <input
          aria-label="Dia das refeições"
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
        />
        <Button primary onClick={() => open("Refeição")}>
          <Plus size={16} /> Refeição
        </Button>
        <Button onClick={() => open("Alimento")}>Cadastrar rótulo</Button>
        <Button onClick={() => open("Metas")}>Editar metas</Button>
      </div>
      <div className="stat-grid">
        {[
          ["Calorias", m.calories, t.calories, "kcal"],
          ["Proteína", m.protein, t.protein, "g"],
          ["Carboidratos", m.carbs, t.carbs, "g"],
          ["Gorduras", m.fat, t.fat, "g"],
        ].map(([label, v, max, unit]) => (
          <Stat
            key={label as string}
            title={label}
            value={meals.length ? fmt(Number(v), 0) : "—"}
            unit={unit}
            foot={
              meals.length
                ? `Meta: ${fmt(Number(max), 0)} ${unit}`
                : `Sem registro · meta ${fmt(Number(max), 0)} ${unit}`
            }
          />
        ))}
      </div>
      <DayPlan {...p} date={date} />
      <div className="home-grid">
        <section className="card">
          <div className="card-head">
            <h2>Diário alimentar</h2>
            <small>{fmt(m.fiber, 0)} g fibras</small>
          </div>
          {meals.length ? (
            meals.map((x) => (
              <div className="log-row" key={x.id}>
                <div>
                  <h3>
                    {x.name} <small>{x.time}</small>
                  </h3>
                  <p>
                    {x.items
                      .map((i: MealItem) => `${i.grams} g ${i.name}`)
                      .join(" · ")}
                  </p>
                  <small>
                    {fmt(x.calories, 0)} kcal · {fmt(x.protein, 0)} g proteína
                  </small>
                </div>
                <button
                  aria-label="Editar refeição"
                  className="text-button"
                  onClick={() => open("Refeição", x)}
                >
                  Editar
                </button>
                <button
                  aria-label="Excluir refeição"
                  className="icon-button"
                  onClick={() => remove("meals", x.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <Empty>
              Nenhuma refeição registrada neste dia. Sem registro não significa
              consumo zero.
            </Empty>
          )}
        </section>
        <section className="card">
          <h2>Ajustes com contexto</h2>
          <p>{calorieReview(data)}</p>
          <div className="divider" />
          <h3>Flexibilidade faz parte</h3>
          <p>
            Uma refeição mais calórica pode ser encaixada no seu dia. Registre
            sem culpa e siga sua rotina, sem compensações extremas.
          </p>
          <div className="divider" />
          <p>
            Proteína inicial: cerca de 1,8–2,2 g/kg nas fases de redução,
            ajustável. Sua meta atual: {fmt(t.protein, 0)} g.
          </p>
        </section>
      </div>
      <MealPlanner {...p} />
      <details className="card">
        <summary>Banco de alimentos · {data.foods.length} opções</summary>
        <p>Valores iniciais aproximados; receitas, preparo e marcas variam.</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Alimento / porção</th>
                <th>kcal</th>
                <th>P</th>
                <th>C</th>
                <th>G</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.foods.map((f) => (
                <tr key={f.id}>
                  <td>
                    {f.name}
                    <small className="block">{f.portion} g/ml</small>
                  </td>
                  <td>{f.calories}</td>
                  <td>{f.protein}</td>
                  <td>{f.carbs}</td>
                  <td>{f.fat}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => open("Alimento", f)}
                    >
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
        <Sparkles className="accent" />
      </div>
      <div className="tabs">
        {["Em casa", "Delivery"].map((x) => (
          <button
            key={x}
            className={mode === x ? "selected" : ""}
            onClick={() => setMode(x)}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="tabs meal-tabs">
        {plan.slots.map((s) => (
          <button
            key={s.name}
            className={meal === s.name ? "selected" : ""}
            onClick={() => {
              setMeal(s.name);
              setItems([]);
              setMealTime(s.name === slotAt().name ? nowTime() : s.time);
            }}
          >
            {s.done && <Check size={13} />} {s.name}
          </button>
        ))}
      </div>
      <p className="insight">
        <strong>
          {slot.name} · sugestão de horário {slot.time}
        </strong>
        <br />
        Cerca de {fmt(slot.target.calories, 0)} kcal e{" "}
        {fmt(slot.target.protein, 0)} g de proteína ={" "}
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
          <div className="form-grid">
            <label>
              Aplicativo
              <select>
                <option>iFood</option>
                <option>Outro</option>
              </select>
            </label>
            <label>
              Tipo de pedido
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {Object.keys(delivery).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="insight">
            {delivery[kind]} Para {meal.toLowerCase()}, mire perto de{" "}
            {fmt(slot.target.calories, 0)} kcal e {fmt(slot.target.protein, 0)}{" "}
            g de proteína. Pergunte sobre lactose e registre a refeição
            estimada. Não há pedido automático.
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
            <label>
              Horário do treino
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
          </div>
          <Button
            primary
            onClick={() => {
              const result = mealIdea(
                available,
                data,
                hunger,
                training || after,
                meal,
              );
              setItems(result);
              if (!result.length)
                notice(
                  "Não reconheci esses alimentos. Cadastre-os no banco ou use a opção Delivery.",
                );
            }}
          >
            Montar minha refeição <ArrowUpRight size={16} />
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
                {fmt(m.calories, 0)} kcal · {fmt(m.protein, 0)} g proteína ·{" "}
                {fmt(m.carbs, 0)} g carboidratos · {fmt(m.fat, 0)} g gordura
              </p>
              <p>
                {training
                  ? `Treino às ${time}: ajuste intervalo, gordura e fibras à sua tolerância digestiva.`
                  : after
                    ? "Após o treino, combine carboidrato e proteína conforme sua fome."
                    : "Ajuste as quantidades à fome e às metas restantes."}{" "}
                Estimativa aproximada.
              </p>
              <label>
                Horário desta refeição
                <input
                  type="time"
                  value={mealTime}
                  onChange={(e) => setMealTime(e.target.value)}
                />
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
export function Body(p: Props) {
  const { data, open, remove } = p,
    c = composition(data),
    [measure, setMeasure] = useState("waist"),
    old = data.weight_logs
      .filter((x) => x.date <= shift(today(), -30))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
  return (
    <>
      <div className="toolbar">
        <Button primary onClick={() => open("Medidas")}>
          <Plus size={16} /> Medidas
        </Button>
        <Button onClick={() => open("BF")}>Registrar BF</Button>
      </div>
      <div className="stat-grid">
        <Stat
          title="BF estimado"
          value={fmt(c.bf)}
          unit="%"
          foot={c.method ?? "Método ainda não registrado"}
        />
        <Stat
          title="Massa magra estimada"
          value={fmt(c.lean)}
          unit="kg"
          foot={c.bfDate ?? "Registre peso e BF na mesma data"}
        />
        <Stat
          title="Massa de gordura"
          value={fmt(c.fat)}
          unit="kg"
          foot="Estimativa aproximada"
        />
        <Stat
          title="Mudança em 30 dias"
          value={old ? fmt(c.weight - old.weight) : "—"}
          unit="kg"
          foot={old ? `Base: ${old.date}` : "Histórico insuficiente"}
        />
      </div>
      <div className="card insight">
        <h2>Progresso de composição corporal</h2>
        <p>{assessment(data)}</p>
      </div>
      <div className="card section">
        <Chart data={data} measure="composition" />
        <p>
          BF aproximado. Massa magra inclui água e outros tecidos; alterações
          não comprovam ganho ou perda de músculo.
        </p>
      </div>
      <div className="card section">
        <label>
          Medida
          <select value={measure} onChange={(e) => setMeasure(e.target.value)}>
            {Object.entries({
              waist: "Cintura",
              abdomen: "Abdômen",
              chest: "Peito",
              armRight: "Braço direito",
              armLeft: "Braço esquerdo",
              thighRight: "Coxa direita",
              thighLeft: "Coxa esquerda",
              hip: "Quadril",
              neck: "Pescoço",
            }).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <Chart data={data} measure={measure} />
      </div>
      <Photos {...p} />
      <details className="card section">
        <summary>Histórico de peso</summary>
        {data.weight_logs.map((x) => (
          <div className="log-row" key={x.id}>
            <span>{x.date}</span>
            <strong>{fmt(x.weight)} kg</strong>
            <button className="text-button" onClick={() => open("Peso", x)}>
              Editar
            </button>
            <button
              aria-label="Excluir pesagem"
              className="icon-button"
              onClick={() => remove("weight_logs", x.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </details>
    </>
  );
}
function Photos({ data, refresh, notice, ask }: Props) {
  const [view, setView] = useState("Frente"),
    [offset, setOffset] = useState(30),
    [busy, setBusy] = useState(false);
  const all = data.progress_photos
      .filter((x) => x.view === view)
      .sort((a, b) => b.date.localeCompare(a.date)),
    current = all[0],
    past = current
      ? all.find((x) => x.date <= shift(current.date, -offset))
      : null;
  return (
    <section className="card section">
      <div className="card-head">
        <h2>Fotos de evolução</h2>
        <Camera size={20} />
      </div>
      <p>
        Mesmo horário, iluminação, local e posição. Preferencialmente pela
        manhã. As fotos são privadas e não geram um BF automático.
      </p>
      <div className="form-grid section">
        <label>
          Posição
          <select value={view} onChange={(e) => setView(e.target.value)}>
            {["Frente", "Costas", "Perfil esquerdo", "Perfil direito"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Comparação
          <select
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
          >
            {[30, 60, 90].map((x) => (
              <option value={x} key={x}>
                {x} dias atrás
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
                <img
                  src={"/api/photos?id=" + x.id}
                  alt={`${view}, ${x.date}`}
                  loading="lazy"
                  decoding="async"
                />
                <small>
                  {i === 0 ? "Mais recente" : "Anterior"} · {x.date}
                </small>
                <button
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
                    const r = await fetch("/api/photos", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: x.id }),
                    });
                    if (r.ok) await refresh();
                    else notice("Não foi possível excluir a foto");
                  }}
                >
                  Excluir foto
                </button>
              </>
            ) : (
              <>
                <Camera size={30} />
                <p>
                  {i === 0
                    ? "Sua primeira foto começa aqui"
                    : `Nenhuma foto de ${offset} dias antes da atual`}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
      <form
        className="toolbar section"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          f.set("view", view);
          try {
            const r = await fetch("/api/photos", { method: "POST", body: f }),
              j = (await r.json()) as { error?: string };
            if (!r.ok) throw Error(j.error);
            await refresh();
            notice("Foto salva com acesso privado.");
          } catch (e) {
            notice(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Data
          <input
            type="date"
            name="date"
            defaultValue={today()}
            max={today()}
            required
          />
        </label>
        <label>
          Foto JPG, PNG ou WebP
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp"
            required
          />
        </label>
        <button disabled={busy} className="button primary">
          {busy ? "Enviando…" : "Salvar foto"}
        </button>
      </form>
    </section>
  );
}
export function Training({ data, open, remove }: Props) {
  const [tab, setTab] = useState("Jiu-Jitsu"),
    bjj = range(data.jiujitsu_sessions, shift(today(), -6)),
    sessions =
      tab === "Jiu-Jitsu"
        ? data.jiujitsu_sessions
        : tab === "Musculação"
          ? data.gym_sessions
          : data.cardio_sessions;
  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          {["Jiu-Jitsu", "Musculação", "Cardio"].map((t) => (
            <button
              key={t}
              className={tab === t ? "selected" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <Button primary onClick={() => open(tab)}>
          <Plus size={16} /> Registrar {tab}
        </Button>
        {tab === "Musculação" && (
          <Button onClick={() => open("Exercício")}>Adicionar exercício</Button>
        )}
      </div>
      {tab === "Jiu-Jitsu" && (
        <>
          <div className="gas-header">
            <Flame size={22} />
            <h2>Condicionamento no tatame</h2>
            <small>Últimos 7 dias</small>
          </div>
          <div className="stat-grid">
            <Stat
              title="Rounds completos"
              value={bjj.length ? bjj.reduce((a, x) => a + x.rounds, 0) : "—"}
              unit=""
              foot="Volume de sparring"
            />
            <Stat
              title="Tempo de sparring"
              value={
                bjj.length
                  ? bjj.reduce((a, x) => a + x.rounds * x.roundMinutes, 0)
                  : "—"
              }
              unit="min"
              foot="Rounds × duração"
            />
            <Stat
              title="Recuperação"
              value={fmt(mean(bjj.map((x) => x.recovery)))}
              unit="/10"
              foot="Entre rounds"
            />
            <Stat
              title="Esforço médio"
              value={fmt(mean(bjj.map((x) => x.rpe)))}
              unit="/10"
              foot="Percepção de esforço"
            />
          </div>
        </>
      )}
      <section className="card">
        <h2>Histórico · {tab}</h2>
        {sessions.length ? (
          sessions.map((x) => (
            <div className="log-row" key={x.id}>
              <div>
                <h3>
                  {x.date} · {x.duration} min
                </h3>
                <p>
                  {tab === "Jiu-Jitsu"
                    ? `${x.rounds} rounds × ${x.roundMinutes} min · cardio ${x.cardio}/10 · força ${x.strength}/10 · pegada: registre nas notas · recuperação ${x.recovery}/10 · fadiga aos ${x.fatigueAt} min`
                    : tab === "Cardio"
                      ? `${x.mode} · ${x.type} · ${x.distance} km · RPE ${x.rpe} · ${x.hr || "—"} bpm`
                      : x.notes}
                </p>
                <small>{x.techniques}</small>
              </div>
              <button className="text-button" onClick={() => open(tab, x)}>
                Editar
              </button>
              <button
                className="icon-button"
                aria-label="Excluir treino"
                onClick={() =>
                  remove(
                    tab === "Jiu-Jitsu"
                      ? "jiujitsu_sessions"
                      : tab === "Cardio"
                        ? "cardio_sessions"
                        : "gym_sessions",
                    x.id,
                  )
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <Empty>
            Registre seu treino para acompanhar esforço, desempenho e
            recuperação.
          </Empty>
        )}
      </section>
      {tab === "Musculação" && (
        <section className="card section">
          <h2>Cargas, volume e PRs</h2>
          {data.gym_exercises.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Exercício</th>
                    <th>Carga</th>
                    <th>Séries × reps</th>
                    <th>Volume</th>
                    <th>RIR</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.gym_exercises.map((x) => (
                    <tr key={x.id}>
                      <td>
                        {x.exercise}
                        <small className="block">{x.date}</small>
                        {x.load ===
                          Math.max(
                            ...data.gym_exercises
                              .filter(
                                (y) =>
                                  y.exercise.toLowerCase() ===
                                  x.exercise.toLowerCase(),
                              )
                              .map((y) => y.load),
                          ) && (
                          <span className="pill">Melhor carga registrada</span>
                        )}
                      </td>
                      <td>{x.load} kg</td>
                      <td>
                        {x.sets} × {x.reps}
                      </td>
                      <td>{x.load * x.reps * x.sets} kg</td>
                      <td>{x.rir}</td>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => open("Exercício", x)}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>
              Adicione exercícios com carga, séries, repetições e RIR.
            </Empty>
          )}
          <p>
            Compare o mesmo exercício e condições semelhantes. PR de carga não
            equivale a estimativa de força máxima.
          </p>
        </section>
      )}
      <div className="card insight section">
        <p>{assessment(data)}</p>
      </div>
    </>
  );
}
export function Recovery({ data, open, save }: Props) {
  const c = data.daily_checkins.find((x) => x.date === today()),
    week = range(data.daily_checkins, shift(today(), -6)),
    settings = latest(data.settings),
    water = data.water_logs
      .filter((x) => x.date === today())
      .reduce((a, x) => a + x.ml, 0),
    r = readiness(
      c,
      range(
        [...data.jiujitsu_sessions, ...data.cardio_sessions],
        shift(today(), -1),
      ).reduce((a, x) => a + x.duration * x.rpe, 0),
    );
  return (
    <>
      <div className="toolbar">
        <Button primary onClick={() => open("Check-in")}>
          <Plus size={16} /> Check-in diário
        </Button>
      </div>
      <div className="stat-grid">
        <Stat
          title="Readiness"
          value={r ?? "—"}
          unit="/100"
          foot="Índice de organização, não diagnóstico"
        />
        <Stat
          title="Sono semanal"
          value={fmt(mean(week.map((x) => x.hours)))}
          unit="h"
          foot={`${week.length} dias registrados`}
        />
        <Stat
          title="Passos hoje"
          value={c ? fmt(c.steps, 0) : "—"}
          unit=""
          foot={`Média semanal: ${fmt(mean(week.map((x) => x.steps)), 0)}`}
        />
        <Stat
          title="Água hoje"
          value={fmt(water / 1000)}
          unit="L"
          foot={`Referência: ${fmt((settings?.water ?? 2500) / 1000)} L`}
        />
      </div>
      <div className="home-grid">
        <section className="card">
          <h2>Hidratação sem exagero</h2>
          <p>
            Ajuste conforme sede, calor, suor e orientação profissional. Não
            force água para cumprir uma barra.
          </p>
          <Meter
            name="Água registrada"
            value={water}
            total={settings?.water ?? 2500}
            unit="ml"
            color="#84b9db"
          />
          <div className="toolbar">
            <Button onClick={() => save("water_logs", { ml: 250 })}>
              <Droplets size={17} /> +250 ml
            </Button>
            <Button onClick={() => save("water_logs", { ml: 500 })}>
              +500 ml
            </Button>
          </div>
        </section>
        <section className="card">
          <h2>Sinais da semana</h2>
          {[
            ["Energia", "energy"],
            ["Fome", "hunger"],
            ["Estresse", "stress"],
            ["Dor muscular", "soreness"],
            ["Motivação", "motivation"],
          ].map(([n, k]) => (
            <div className="log-row" key={k}>
              <span>{n}</span>
              <strong>{fmt(mean(week.map((x) => x[k])))}/10</strong>
            </div>
          ))}
        </section>
      </div>
      <section className="card">
        <h2>Seus check-ins</h2>
        {data.daily_checkins.length ? (
          data.daily_checkins.map((x) => (
            <div className="log-row" key={x.id}>
              <span>{x.date}</span>
              <span>
                {x.hours}h sono · energia {x.energy}/10 · {x.steps} passos
              </span>
              <button
                className="text-button"
                onClick={() => open("Check-in", x)}
              >
                Editar
              </button>
            </div>
          ))
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
    trend = weightTrend(data.weight_logs),
    avg = weightMean(data.weight_logs);
  return (
    <>
      <div className="toolbar">
        <Button primary onClick={() => open("Campeonato")}>
          <Plus size={16} /> Configurar evento
        </Button>
        <Button onClick={() => open("Categoria")}>Adicionar categoria</Button>
      </div>
      <div className="card competition-feature">
        <Trophy size={32} />
        <div>
          <h2>{active?.name ?? "Nenhum evento cadastrado"}</h2>
          <p>
            {active
              ? `${shortDate(active.eventDate)} · ${active.category}`
              : "Cadastre data, categoria e condições da pesagem quando a organização confirmar."}
          </p>
        </div>
        <span className="pill">Performance em primeiro lugar</span>
      </div>
      <div className="stat-grid section">
        <Stat
          title="Peso sem kimono"
          value={latest(data.weight_logs) ? fmt(c.weight) : "—"}
          unit="kg"
          foot="Última pesagem"
        />
        <Stat
          title="Com kimono (estimado)"
          value={active && latest(data.weight_logs) ? fmt(c.weight + active.gi) : "—"}
          unit="kg"
          foot={
            active
              ? `${fmt(active.gi)} kg de kimono informados`
              : "Informe o peso do kimono no evento"
          }
        />
        <Stat
          title="Referência intermediária"
          value={active ? fmt(active.reference) : "—"}
          unit="kg"
          foot={
            active
              ? "Não substitui composição corporal"
              : "Defina ao cadastrar o evento"
          }
        />
        <Stat
          title="Dias até o evento"
          value={active ? days(active.eventDate, today()) : "—"}
          unit=""
          foot="Confirme a data oficial"
        />
      </div>
      {active && (
        <div className="card">
          <h2>Condições da pesagem</h2>
          <p>
            {active.weighDate} às {active.weighTime} ·{" "}
            {active.withGi ? "com" : "sem"} kimono · {active.fightGap} min até
            lutar · limite {fmt(active.limit)} kg
          </p>
          <Button onClick={() => open("Campeonato", active)}>
            Editar evento
          </Button>
        </div>
      )}
      <div className="home-grid section">
        <section className="card">
          <h2>Projeções, não certezas</h2>
          <div className="log-row">
            <span>Peso estimado em 30 dias</span>
            <strong>
              {trend != null && avg != null
                ? fmt(avg + (trend * 30) / 7) + " kg"
                : "Dados insuficientes"}
            </strong>
          </div>
          <div className="log-row">
            <span>Peso estimado no campeonato</span>
            <strong>
              {active && trend != null && avg != null
                ? fmt(avg + (trend * days(active.eventDate, today())) / 7) +
                  " kg"
                : "Dados insuficientes"}
            </strong>
          </div>
          <p>
            Extrapolação simples das últimas duas semanas. BF e cintura não são
            projetados a partir do peso. Não use esta projeção como plano de
            corte.
          </p>
        </section>
        <section className="card">
          <Shield size={24} className="accent" />
          <h2>Chegue pronto para lutar</h2>
          <p>
            Não use diuréticos, laxantes, vômito, sauna agressiva, restrição
            extrema de água, jejum prolongado ou medicamentos não prescritos
            para bater peso. Uma categoria compatível com sua condição pode
            favorecer sua performance.
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
                  <th>Peso na condição</th>
                  <th>Diferença</th>
                </tr>
              </thead>
              <tbody>
                {data.competition_categories.map((x) => (
                  <tr key={x.id}>
                    <td>
                      {x.name} · {x.withGi ? "com kimono" : "sem kimono"}
                    </td>
                    <td>{fmt(x.limit)} kg</td>
                    {(() => {
                      // With-gi weight needs the kimono weight from a real event.
                      const current =
                        !latest(data.weight_logs) || (x.withGi && !active)
                          ? null
                          : c.weight + (x.withGi ? active!.gi : 0);
                      return (
                        <>
                          <td>{current == null ? "—" : `${fmt(current)} kg`}</td>
                          <td>
                            {current == null
                              ? "Cadastre o evento"
                              : `${fmt(current - x.limit)} kg`}
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>
            Cadastre apenas categorias confirmadas pela organização.
          </Empty>
        )}
      </section>
      {events.some((e) => e.archived) && (
        <section className="card section">
          <h2>Pós-competição · qual direção seguir?</h2>
          <p>
            Seu evento foi arquivado. Revise peso, BF, fotos, cintura, força,
            performance e energia. Escolha continuar reduzindo gordura, manter,
            recompor ou iniciar ganho controlado nas configurações. A fase não
            mudou automaticamente.
          </p>
          {events
            .filter((e) => e.archived)
            .map((e) => (
              <p key={e.id}>
                {e.name} · {e.eventDate} · arquivado
              </p>
            ))}
        </section>
      )}
    </>
  );
}
export function Reports({ data }: Props) {
  const [selected, setSelected] = useState(""),
    r =
      data.weekly_reports.find((x) => x.id === selected) ??
      data.weekly_reports[0];
  return (
    <>
      <div className="card insight">
        <h2>Seu panorama da semana</h2>
        <p>
          Relatórios de domingo são gerados ao abrir o app após o encerramento
          da semana. Sem dados não há conclusões inventadas. Médias alimentares
          consideram somente dias registrados, que podem estar incompletos.
        </p>
      </div>
      {!r ? (
        <section className="card section">
          <Empty>
            Seu primeiro relatório estará disponível no domingo após o início
            dos registros.
          </Empty>
        </section>
      ) : (
        <>
          <label className="section">
            Semana
            <select value={r.id} onChange={(e) => setSelected(e.target.value)}>
              {data.weekly_reports.map((x) => (
                <option value={x.id} key={x.id}>
                  {x.start} a {x.date}
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
                  ? `Variação: ${fmt(r.weight - r.previousWeight)} kg`
                  : "Sem semana anterior"
              }
            />
            <Stat
              title="Proteína média"
              value={fmt(r.protein, 0)}
              unit="g"
              foot={`${r.mealDays} dias com alimentação registrada`}
            />
            <Stat
              title="Sono médio"
              value={fmt(r.sleep)}
              unit="h"
              foot="Dias registrados"
            />
            <Stat
              title="Consistência de registros"
              value={r.consistency}
              unit="%"
              foot="Peso, refeições e check-ins"
            />
          </div>
          <div className="home-grid">
            <section className="card">
              <h2>Alimentação e composição</h2>
              {[
                ["Calorias", fmt(r.calories, 0) + " kcal"],
                ["Carboidratos", fmt(r.carbs, 0) + " g"],
                ["Gorduras", fmt(r.fat, 0) + " g"],
                ["Cintura", fmt(r.waist) + " cm"],
                ["BF aproximado", fmt(r.bf) + "%"],
                ["Massa magra estimada", fmt(r.lean) + " kg"],
              ].map(([k, v]) => (
                <div className="log-row" key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </section>
            <section className="card">
              <h2>Treino e recuperação</h2>
              {[
                ["Jiu-Jitsu", r.bjj + " sessões"],
                ["Musculação", r.gym + " sessões"],
                ["Cardio", r.cardio + " sessões"],
                ["Energia", fmt(r.energy) + "/10"],
                ["Força no Jiu-Jitsu", fmt(r.strengthScore) + "/10"],
                ["Cardio no Jiu-Jitsu", fmt(r.cardioScore) + "/10"],
                ["Performance no tatame", fmt(r.bjjPerformance) + "/10"],
                ["Fome", fmt(r.hunger) + "/10"],
                ["Estresse", fmt(r.stress) + "/10"],
              ].map(([k, v]) => (
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
              Consistência descreve registros, não o seu valor ou disciplina.
              Dias não registrados podem ter sido bons dias.
            </p>
          </div>
        </>
      )}
    </>
  );
}
export function Assistant(p: Props) {
  const { data, refresh, notice } = p,
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [mode, setMode] = useState("basic");
  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json() as Promise<{ mode: string }>)
      .then((j) => setMode(j.mode))
      .catch(() => {});
  }, []);
  async function send(text: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        }),
        j = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(j.error);
      await refresh();
      setMessage("");
    } catch (e) {
      notice(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="card assistant-intro">
        <Sparkles size={26} className="accent" />
        <h2>Contexto para decidir melhor.</h2>
        <p>
          O assistente consulta seu perfil, metas, alimentação, treinos e
          recuperação antes de responder.
        </p>
        <span className="pill">
          {mode === "ollama"
            ? "Ollama · IA no seu computador"
            : mode === "ai"
              ? "IA configurada"
              : "Modo básico · regras com seus registros"}
        </span>
        {mode === "ollama" && (
          <p>
            Mantenha o computador, o Ollama e a conexão do BODY OS ligados. A
            resposta pode levar até dois minutos. O histórico continua
            armazenado no BODY OS.
          </p>
        )}
        {mode !== "ai" && mode !== "ollama" && (
          <p>
            IA generativa ainda não ativada. O modo básico reconhece os temas
            abaixo; não compreende toda conversa livre.
          </p>
        )}
      </section>
      <section className="card section">
        <h2>O que faço agora?</h2>
        <p style={{ whiteSpace: "pre-line" }}>{nextStep(data)}</p>
      </section>
      <div className="prompt-grid">
        {[
          "O que eu almoço?",
          "Meu peso subiu hoje.",
          "Estou cansando muito no treino.",
          "Posso comer hambúrguer?",
        ].map((q) => (
          <button disabled={busy} key={q} onClick={() => send(q)}>
            {q}
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
      <div className="chat-history">
        {[...data.ai_conversations]
          .sort((a, b) =>
            String(a.createdAt).localeCompare(String(b.createdAt)),
          )
          .slice(-20)
          .map((x) => (
            <div key={x.id}>
              <div className="message user">{x.message}</div>
              <div className="message assistant">
                <span className="accent">
                  <Sparkles size={16} /> BODY OS ·{" "}
                  {x.mode === "ollama"
                    ? "Ollama local"
                    : x.mode === "ai"
                      ? "IA"
                      : "modo básico"}
                </span>
                <p>{x.response}</p>
              </div>
            </div>
          ))}
        {busy && <p role="status">Consultando seus registros…</p>}
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(message);
        }}
      >
        <input
          aria-label="Mensagem ao assistente"
          placeholder="Escreva o que está acontecendo no seu dia…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          required
        />
        <button
          disabled={busy || !message.trim()}
          className="button primary"
          aria-label="Enviar mensagem"
        >
          <Send size={18} />
        </button>
      </form>
      <section className="card section link-card">
        <div>
          <h2>Montar uma refeição agora</h2>
          <p>
            O planejador de refeições usa o que você tem em casa ou sugere um
            pedido, dentro da meta de cada horário.
          </p>
        </div>
        <button className="button" onClick={() => p.go("Alimentação")}>
          Abrir em Alimentação <ChevronRight size={16} />
        </button>
      </section>
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
    "Após a primeira abertura conectada, peso, refeições, treinos, medidas e check-ins ficam disponíveis offline neste dispositivo e sincronizam ao reabrir o app com internet. Fotos, chat e exclusões exigem conexão.",
  ],
  [
    "Como o readiness é calculado?",
    "É uma heurística de sono, energia, fadiga, dor, estresse e carga recente, não um instrumento clínico validado.",
  ],
  [
    "O BF estimado é preciso?",
    "Não. O BF por circunferências usa a fórmula US Navy para homens adultos, com erro individual relevante. Trate como tendência, não como medição.",
  ],
  [
    "De onde vêm os valores dos alimentos e das calorias?",
    "Os alimentos iniciais são sementes aproximadas e editáveis. A contagem de calorias não mede com precisão o seu gasto.",
  ],
  [
    "O que ainda não existe no app?",
    "Integração com Apple Health (passos são registrados manualmente), visão computacional de refeições, BF por análise automática de fotos, sincronização com relógios e notificações em segundo plano.",
  ],
] as const;
const SOURCES = [
  [
    "ISSN · proteína e exercício",
    "https://link.springer.com/article/10.1186/s12970-017-0177-8",
  ],
  [
    "AIS · categorias de peso e performance",
    "https://www.ausport.gov.au/ais/position_statements/making-weight-in-weight-category-sports",
  ],
] as const;
export function SettingsView(p: Props) {
  const { data, save, notice } = p;
  return (
    <>
      <section className="card">
        <h2>Seu sistema, suas escolhas</h2>
        <p>
          Sugestão de fase: {phaseSuggestion(data).phase}.{" "}
          {phaseSuggestion(data).reason} A escolha é sua; salve abaixo para
          mudar.
        </p>
        <div className="section">
          <RecordForm
            kind="Configurações"
            data={data}
            save={save}
            busy={false}
          />
        </div>
      </section>
      <section className="card section">
        <h2>Seus três níveis de objetivo</h2>
        {data.goals
          .filter((g) => g.active)
          .map((g) => (
            <div className="log-row" key={g.id}>
              <span className="pill">{g.type}</span>
              <p>{g.title}</p>
            </div>
          ))}
      </section>
      <section className="card section">
        <h2>Privacidade e portabilidade</h2>
        <p>
          Registros persistem no banco privado e uma cópia local permite uso
          offline. Use um dispositivo pessoal protegido por senha. Limpar os
          dados do navegador apaga registros ainda não sincronizados. Fotos têm
          acesso autenticado. Quando ativada, a IA recebe contexto textual do
          histórico; fotos não são enviadas. O backup inclui registros e
          metadados, mas não os arquivos das fotos.
        </p>
        <Button
          onClick={() => {
            const blob = new Blob(
                [
                  JSON.stringify(
                    { version: 1, exportedAt: new Date().toISOString(), data },
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
          }}
        >
          <Download size={17} /> Exportar meus registros
        </Button>
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
