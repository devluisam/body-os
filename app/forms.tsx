"use client";
import { useRef, useState, type FormEvent } from "react";
import { ChevronDown, Copy, History, Plus, Repeat, Trash2 } from "lucide-react";
import {
  Data,
  Draft,
  Row,
  Table,
  today,
  PHASES,
  targets,
  latest,
  fmt,
  foodMacros,
  macros,
  slotAt,
  MEAL_SLOTS,
  type MealItemInput,
  profile,
  parseDecimal,
  ago,
  nowTime,
  shift,
} from "@/lib/body";
import { DecimalInput, Scale } from "./fields";
// keepOpen: save without closing the dialog, for a record created mid-form.
export type SaveOptions = { keepOpen?: boolean; notice?: string };
export type Save = (
  table: Table,
  payload: Record<string, unknown>,
  options?: SaveOptions,
) => Promise<boolean>;
type Option = string | readonly [value: string, label: string];
type Field = {
  key: string;
  label: string;
  type:
    | "decimal"
    | "int"
    | "text"
    | "time"
    | "date"
    | "select"
    | "scale"
    | "check"
    | "days";
  min?: number;
  max?: number;
  options?: readonly Option[];
  // Required unless marked optional; optional fields left empty are saved as
  // "not measured", never as 0.
  optional?: boolean;
  // Shown under "Mais detalhes" so the usual entry stays short.
  extra?: boolean;
  low?: string;
  high?: string;
  // Older records stored 0 for "not measured" in these fields.
  legacyZero?: boolean;
};
const scale = (
  key: string,
  label: string,
  low: string,
  high: string,
  more: Partial<Field> = {},
): Field => ({ key, label, type: "scale", min: 0, max: 10, low, high, ...more });
const GI: Option[] = ["Com kimono", "Sem kimono"];
const formFields: Record<string, Field[]> = {
  Peso: [{ key: "weight", label: "Peso sem kimono (kg)", type: "decimal", min: 30, max: 250 }],
  Medidas: [
    { key: "waist", label: "Cintura (cm)", type: "decimal", min: 30, max: 200 },
    { key: "abdomen", label: "Abdômen no umbigo (cm)", type: "decimal", min: 30, max: 200 },
    { key: "neck", label: "Pescoço (cm)", type: "decimal", min: 15, max: 80 },
    ...(
      [
        ["chest", "Peito"],
        ["armRight", "Braço direito"],
        ["armLeft", "Braço esquerdo"],
        ["thighRight", "Coxa direita"],
        ["thighLeft", "Coxa esquerda"],
        ["hip", "Quadril"],
      ] as const
    ).map(
      ([key, label]): Field => ({
        key,
        label: `${label} (cm)`,
        type: "decimal",
        min: 10,
        max: 200,
        optional: true,
        extra: true,
      }),
    ),
  ],
  BF: [
    { key: "bf", label: "Gordura estimada (%)", type: "decimal", min: 3, max: 60 },
    {
      key: "method",
      label: "Método",
      type: "select",
      options: ["Bioimpedância", "Avaliação profissional", "Avaliação visual manual"],
    },
  ],
  "Jiu-Jitsu": [
    { key: "duration", label: "Duração do treino (min)", type: "int", min: 1, max: 300 },
    { key: "rounds", label: "Rounds de sparring", type: "int", min: 0, max: 50 },
    { key: "roundMinutes", label: "Minutos por round", type: "int", min: 1, max: 20 },
    scale("rpe", "Esforço do treino (RPE)", "muito leve", "máximo", { min: 1 }),
    scale("performance", "Como você lutou", "muito abaixo", "seu melhor"),
    scale("cardio", "Fôlego", "sem fôlego", "sobrando", { optional: true, extra: true }),
    scale("strength", "Força", "fraco", "muito forte", { optional: true, extra: true }),
    scale("technique", "Técnica", "travado", "fluindo", { optional: true, extra: true }),
    scale("energy", "Energia", "vazio", "cheio", { optional: true, extra: true }),
    scale("recovery", "Recuperação entre rounds", "não recuperava", "rápida", {
      optional: true,
      extra: true,
    }),
    { key: "fatigueAt", label: "Minutos até cansar", type: "int", min: 1, max: 300, optional: true, extra: true, legacyZero: true },
    { key: "hr", label: "FC média (bpm)", type: "int", min: 30, max: 240, optional: true, extra: true, legacyZero: true },
    { key: "techniques", label: "Técnicas, posições e notas", type: "text", optional: true, extra: true },
  ],
  Musculação: [
    { key: "duration", label: "Duração (min)", type: "int", min: 1, max: 240 },
    { key: "notes", label: "Notas do treino", type: "text", optional: true },
  ],
  Exercício: [
    { key: "exercise", label: "Exercício", type: "text" },
    { key: "load", label: "Carga (kg)", type: "decimal", min: 0, max: 500 },
    { key: "sets", label: "Séries", type: "int", min: 1, max: 30 },
    { key: "reps", label: "Repetições", type: "int", min: 1, max: 100 },
    { key: "rir", label: "Repetições em reserva (RIR)", type: "int", min: 0, max: 10 },
    scale("rpe", "Esforço (RPE)", "muito leve", "máximo", { min: 1, optional: true, extra: true }),
  ],
  Cardio: [
    { key: "mode", label: "Modalidade", type: "select", options: ["Bike", "Esteira", "Corrida", "Caminhada"] },
    { key: "type", label: "Tipo", type: "select", options: ["Zona 2", "Intervalado", "Livre"] },
    { key: "duration", label: "Duração (min)", type: "int", min: 1, max: 300 },
    scale("rpe", "Esforço (RPE)", "muito leve", "máximo", { min: 1 }),
    { key: "hr", label: "FC média (bpm)", type: "int", min: 30, max: 240, optional: true, extra: true, legacyZero: true },
    { key: "distance", label: "Distância (km)", type: "decimal", min: 0.01, max: 100, optional: true, extra: true, legacyZero: true },
    { key: "speed", label: "Velocidade (km/h)", type: "decimal", min: 0.1, max: 50, optional: true, extra: true, legacyZero: true },
    { key: "incline", label: "Inclinação (%)", type: "decimal", min: 0, max: 30, optional: true, extra: true, legacyZero: true },
  ],
  Metas: [
    { key: "calories", label: "Calorias (kcal)", type: "int", min: 1800, max: 5000 },
    { key: "protein", label: "Proteína (g)", type: "int", min: 80, max: 250 },
    { key: "carbs", label: "Carboidratos (g)", type: "int", min: 100, max: 800 },
    { key: "fat", label: "Gorduras (g)", type: "int", min: 40, max: 180 },
    { key: "fiber", label: "Fibras (g)", type: "int", min: 15, max: 60 },
  ],
  Alimento: [
    { key: "name", label: "Nome e preparo", type: "text" },
    { key: "portion", label: "Porção do rótulo (g ou ml)", type: "decimal", min: 1, max: 1000 },
    { key: "calories", label: "Calorias por porção (kcal)", type: "decimal", min: 0, max: 10000 },
    { key: "protein", label: "Proteína (g)", type: "decimal", min: 0, max: 1000 },
    { key: "carbs", label: "Carboidrato (g)", type: "decimal", min: 0, max: 1000 },
    { key: "fat", label: "Gordura (g)", type: "decimal", min: 0, max: 1000 },
    { key: "fiber", label: "Fibra (g)", type: "decimal", min: 0, max: 1000 },
    { key: "sodium", label: "Sódio (mg)", type: "decimal", min: 0, max: 100000 },
  ],
  Campeonato: [
    { key: "name", label: "Evento", type: "text" },
    { key: "eventDate", label: "Data do evento", type: "date" },
    { key: "category", label: "Categoria", type: "text" },
    { key: "limit", label: "Limite da categoria (kg)", type: "decimal", min: 30, max: 200 },
    { key: "withGi", label: "Pesagem", type: "select", options: GI },
    { key: "gi", label: "Peso do kimono (kg)", type: "decimal", min: 0, max: 5 },
    { key: "weighDate", label: "Data da pesagem", type: "date" },
    { key: "weighTime", label: "Horário da pesagem", type: "time" },
    { key: "fightGap", label: "Minutos entre pesagem e luta", type: "int", min: 0, max: 1440 },
    { key: "reference", label: "Sua referência sem kimono (kg)", type: "decimal", min: 30, max: 200 },
  ],
  Categoria: [
    { key: "name", label: "Nome da categoria", type: "text" },
    { key: "limit", label: "Limite (kg)", type: "decimal", min: 30, max: 200 },
    { key: "withGi", label: "Pesagem", type: "select", options: GI },
  ],
  Configurações: [
    { key: "name", label: "Nome do sistema", type: "text" },
    { key: "phase", label: "Fase", type: "select", options: PHASES },
    { key: "steps", label: "Meta de passos", type: "int", min: 1000, max: 30000 },
    { key: "water", label: "Referência de água (ml)", type: "int", min: 500, max: 6000 },
    { key: "bfGoal", label: "Meta de BF (%)", type: "decimal", min: 8, max: 40, optional: true },
    {
      key: "theme",
      label: "Aparência",
      type: "select",
      options: [
        ["dark", "Escuro"],
        ["light", "Claro"],
      ],
    },
  ],
  Perfil: [
    {
      key: "sex",
      label: "Sexo (usado na fórmula de gasto)",
      type: "select",
      options: [
        ["male", "Masculino"],
        ["female", "Feminino"],
      ],
    },
    { key: "age", label: "Idade", type: "int", min: 14, max: 90 },
    { key: "height", label: "Altura (cm)", type: "int", min: 120, max: 230 },
    { key: "lactoseIntolerant", label: "Intolerância à lactose", type: "check" },
    { key: "bjjDays", label: "Dias de Jiu-Jitsu", type: "days" },
    { key: "bjjTime", label: "Horário do Jiu-Jitsu", type: "time", optional: true },
    { key: "gymTime", label: "Horário da musculação", type: "time", optional: true },
  ],
  Objetivo: [
    { key: "title", label: "Objetivo", type: "text" },
    {
      key: "type",
      label: "Nível",
      type: "select",
      options: ["principal", "esportivo", "temporário"],
    },
    { key: "active", label: "Ativo", type: "check" },
  ],
};
const tables: Record<string, Table> = {
  Peso: "weight_logs",
  Medidas: "body_measurements",
  BF: "body_metrics",
  "Check-in": "daily_checkins",
  "Jiu-Jitsu": "jiujitsu_sessions",
  Musculação: "gym_sessions",
  Exercício: "gym_exercises",
  Cardio: "cardio_sessions",
  Metas: "nutrition_targets",
  Alimento: "foods",
  Campeonato: "competition_events",
  Categoria: "competition_categories",
  Configurações: "settings",
  Perfil: "users",
  Objetivo: "goals",
};
// Records without a "date of the record" field: they describe the athlete,
// not a day.
const UNDATED = ["Configurações", "Metas", "Perfil", "Objetivo", "Campeonato", "Categoria", "Alimento"];
const NOTES: Record<string, string> = {
  Peso: "Pela manhã, depois do banheiro e sem kimono. Um registro por dia: salvar de novo atualiza a pesagem do dia.",
  BF: "Estimativa aproximada. Não compare métodos como se tivessem a mesma precisão.",
  Metas: "O ponto inicial usa Mifflin–St Jeor e atividade estimada. Calibre com registros reais. Nada muda até você salvar.",
  Configurações: "A fase só muda quando você salvar. A meta de BF pode ficar vazia. Água é referência, sem obrigação de beber além da sede.",
  Campeonato: "Confirme as regras com a organização. O app não recomenda desidratação para entrar numa categoria.",
  Perfil: "Idade, altura e sexo entram no cálculo inicial de calorias; altura também entra no BF por medidas.",
  Exercício: "Compare o mesmo exercício em condições parecidas.",
};
export function formTitle(kind: string, editing: boolean) {
  const names: Record<string, string> = {
    Peso: "pesagem",
    "Check-in": "check-in",
    Refeição: "refeição",
    Treino: "treino",
    Medidas: "medidas",
    BF: "BF",
    Alimento: "alimento",
    Exercício: "exercício",
    Campeonato: "evento",
    Categoria: "categoria",
    Metas: "metas",
  };
  if (kind === "Perfil") return "Seu perfil";
  if (kind === "Configurações") return "Configurações";
  if (kind === "Objetivo") return editing ? "Editar objetivo" : "Novo objetivo";
  return `${editing ? "Editar" : "Registrar"} ${names[kind] ?? kind.toLowerCase()}`;
}
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const optionValue = (o: Option) => (typeof o === "string" ? o : o[0]);
const optionLabel = (o: Option) => (typeof o === "string" ? o : o[1]);
// Reads one field back from the form; undefined means "left empty".
function readField(form: FormData, f: Field): unknown {
  const raw = form.get(f.key);
  switch (f.type) {
    case "decimal":
      return raw === "" || raw == null ? undefined : (parseDecimal(raw) ?? NaN);
    case "int":
    case "scale":
      return raw === "" || raw == null ? undefined : Number(raw);
    case "check":
      return raw === "on";
    case "days":
      return form.getAll(f.key).map(Number);
    case "select":
      return f.key === "withGi" ? raw === "Com kimono" : raw;
    default:
      return typeof raw === "string" ? raw.trim() || undefined : undefined;
  }
}
// One message that names every field to fix, in the order they appear.
function validate(fields: Field[], payload: Record<string, unknown>) {
  const problems: string[] = [];
  for (const f of fields) {
    const v = payload[f.key];
    if (v === undefined) {
      if (!f.optional && f.type !== "check" && f.type !== "days")
        problems.push(`${f.label}: preencha`);
      continue;
    }
    if (typeof v === "number") {
      if (Number.isNaN(v)) problems.push(`${f.label}: use só números, como 85,4`);
      else if (f.min != null && v < f.min) problems.push(`${f.label}: mínimo ${fmt(f.min, f.min % 1 ? 1 : 0)}`);
      else if (f.max != null && v > f.max) problems.push(`${f.label}: máximo ${fmt(f.max, 0)}`);
    }
  }
  return problems;
}
function FieldInput({
  f,
  value,
  autoFocus,
  placeholder,
  onBlur,
}: {
  f: Field;
  value: unknown;
  autoFocus?: boolean;
  placeholder?: string;
  onBlur?: (v: string) => void;
}) {
  const shown =
    value == null || (f.legacyZero && value === 0) ? "" : String(value);
  if (f.type === "scale")
    return (
      <Scale
        name={f.key}
        label={f.label}
        low={f.low!}
        high={f.high!}
        min={f.min}
        max={f.max}
        required={!f.optional}
        defaultValue={typeof value === "number" ? value : undefined}
      />
    );
  if (f.type === "check")
    return (
      <label className="check">
        <input type="checkbox" name={f.key} defaultChecked={!!value} />
        {f.label}
      </label>
    );
  if (f.type === "days")
    return (
      <fieldset className="day-picker">
        <legend>{f.label}</legend>
        <div>
          {WEEKDAYS.map((d, i) => (
            <label key={d}>
              <input
                type="checkbox"
                name={f.key}
                value={i}
                defaultChecked={Array.isArray(value) && value.includes(i)}
              />
              <span>{d}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  const label = (
    <>
      {f.label}
      {f.optional && <span className="optional"> · opcional</span>}
    </>
  );
  if (f.type === "select")
    return (
      <label>
        {label}
        <select
          name={f.key}
          defaultValue={
            f.key === "withGi"
              ? value === false
                ? "Sem kimono"
                : "Com kimono"
              : String(value ?? optionValue(f.options![0]))
          }
        >
          {f.options!.map((o) => (
            <option key={optionValue(o)} value={optionValue(o)}>
              {optionLabel(o)}
            </option>
          ))}
        </select>
      </label>
    );
  if (f.type === "decimal")
    return (
      <label>
        {label}
        <DecimalInput
          name={f.key}
          defaultValue={shown.replace(".", ",")}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
        />
      </label>
    );
  return (
    <label>
      {label}
      <input
        name={f.key}
        type={f.type === "int" ? "number" : f.type}
        inputMode={f.type === "int" ? "numeric" : undefined}
        min={f.type === "int" ? f.min : undefined}
        max={f.type === "int" ? f.max : undefined}
        step={f.type === "int" ? 1 : undefined}
        defaultValue={shown}
        autoFocus={autoFocus}
        placeholder={placeholder}
        maxLength={f.type === "text" ? (f.key === "techniques" || f.key === "notes" ? 3000 : 150) : undefined}
        list={f.key === "exercise" ? "exercise-names" : undefined}
        onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
      />
    </label>
  );
}
export function RecordForm({
  kind,
  data,
  save,
  busy,
  initial,
}: {
  kind: string;
  data: Data;
  save: Save;
  busy: boolean;
  initial?: Draft;
}) {
  const [mode, setMode] = useState("Jiu-Jitsu");
  if (kind === "Treino")
    return (
      <>
        <div className="tabs" role="group" aria-label="Tipo de treino">
          {["Jiu-Jitsu", "Musculação", "Cardio"].map((k) => (
            <button
              type="button"
              className={mode === k ? "selected" : ""}
              aria-pressed={mode === k}
              key={k}
              onClick={() => setMode(k)}
            >
              {k}
            </button>
          ))}
        </div>
        <RecordForm key={mode} kind={mode} data={data} save={save} busy={busy} />
      </>
    );
  if (kind === "Refeição")
    return <MealForm data={data} save={save} busy={busy} initial={initial} />;
  if (kind === "Check-in")
    return <CheckinForm data={data} save={save} busy={busy} initial={initial} />;
  return <GenericForm kind={kind} data={data} save={save} busy={busy} initial={initial} />;
}
const TRAINING: Record<string, Table> = {
  "Jiu-Jitsu": "jiujitsu_sessions",
  Musculação: "gym_sessions",
  Cardio: "cardio_sessions",
};
// Only the structure of a session repeats; how it felt is always answered fresh.
const REPEATABLE: Record<string, string[]> = {
  "Jiu-Jitsu": ["duration", "rounds", "roundMinutes"],
  Musculação: ["duration"],
  Cardio: ["mode", "type", "duration", "distance", "speed", "incline"],
};
function GenericForm({
  kind,
  data,
  save,
  busy,
  initial,
}: {
  kind: string;
  data: Data;
  save: Save;
  busy: boolean;
  initial?: Draft;
}) {
  const fields = formFields[kind],
    [seed, setSeed] = useState<Draft | undefined>(),
    [version, setVersion] = useState(0),
    [problem, setProblem] = useState(""),
    [hint, setHint] = useState("");
  const defaults: Draft | undefined =
    seed ??
    initial ??
    (kind === "Metas"
      ? targets(data)
      : kind === "Configurações"
        ? latest(data.settings)
        : kind === "Perfil"
          ? latest(data.users)
          : kind === "Objetivo"
            ? { type: "temporário", active: true }
            : undefined);
  const lastWeight = latest(data.weight_logs),
    lastSession = TRAINING[kind] ? latest(data[TRAINING[kind]]) : undefined,
    lastMeasure = kind === "Medidas" ? latest(data.body_measurements) : undefined;
  const exercises = [...new Set(data.gym_exercises.map((x) => String(x.exercise)))];
  const lastOf = (name: string) =>
    latest(
      data.gym_exercises.filter(
        (x) => String(x.exercise).toLowerCase() === name.trim().toLowerCase(),
      ),
    );
  const formRef = useRef<HTMLFormElement>(null);
  const main = fields.filter((f) => !f.extra),
    extra = fields.filter((f) => f.extra);
  const placeholder = (f: Field) =>
    kind === "Peso" && lastWeight
      ? `Última: ${fmt(lastWeight.weight)} (${ago(lastWeight.date)})`
      : lastMeasure && typeof lastMeasure[f.key] === "number"
        ? `Última: ${fmt(lastMeasure[f.key])}`
        : undefined;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget),
      payload: Record<string, unknown> = {
        // The profile keeps its first date: weekly reports start from it.
        date:
          (form.get("date") as string | null) ??
          initial?.date ??
          (kind === "Perfil" ? defaults?.date : undefined) ??
          today(),
      };
    for (const f of fields) payload[f.key] = readField(form, f);
    const problems = validate(fields, payload);
    if (problems.length) return setProblem(problems.join(" · "));
    setProblem("");
    if (kind === "Configurações") payload.bfGoal = payload.bfGoal ?? null;
    if (kind === "Objetivo" && !initial?.id) payload.id = crypto.randomUUID();
    if (initial?.id) payload.id = initial.id;
    await save(tables[kind], payload);
  }
  return (
    <form ref={formRef} onSubmit={submit} noValidate key={version}>
      {lastSession && !initial && REPEATABLE[kind] && (
        <button
          type="button"
          className="repeat-chip"
          onClick={() => {
            setSeed(
              Object.fromEntries(
                REPEATABLE[kind]
                  .filter((k) => lastSession[k] != null)
                  .map((k) => [k, lastSession[k]]),
              ),
            );
            setVersion((v) => v + 1);
          }}
        >
          <Repeat size={15} aria-hidden /> Repetir estrutura de{" "}
          {ago(lastSession.date)}
          <small>
            {REPEATABLE[kind]
              .filter((k) => lastSession[k] != null && lastSession[k] !== 0)
              .map((k) =>
                k === "duration"
                  ? `${lastSession[k]} min`
                  : k === "rounds"
                    ? `${lastSession[k]} rounds`
                    : k === "roundMinutes"
                      ? `de ${lastSession[k]} min`
                      : String(lastSession[k]),
              )
              .join(" ")}
          </small>
        </button>
      )}
      {!UNDATED.includes(kind) && (
        <label>
          Data
          <input
            name="date"
            type="date"
            defaultValue={initial?.date ?? today()}
            max={today()}
            required
          />
        </label>
      )}
      {kind === "Exercício" && (
        <datalist id="exercise-names">
          {exercises.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
      )}
      <div className="form-grid">
        {main.map((f, i) => (
          <FieldInput
            key={f.key}
            f={f}
            value={defaults?.[f.key]}
            autoFocus={i === 0 && !initial && (kind === "Peso" || kind === "Exercício" || kind === "Medidas")}
            placeholder={placeholder(f)}
            onBlur={
              f.key === "exercise"
                ? (name) => {
                    const last = lastOf(name);
                    setHint(
                      last
                        ? `Última vez (${ago(last.date)}): ${fmt(last.load)} kg · ${last.sets}×${last.reps} · RIR ${last.rir}`
                        : name.trim()
                          ? "Primeiro registro deste exercício."
                          : "",
                    );
                    // Fills only what is still empty, never over a typed value.
                    const el = formRef.current?.elements;
                    if (last && el)
                      for (const k of ["load", "sets", "reps", "rir"]) {
                        const input = el.namedItem(k) as HTMLInputElement | null;
                        if (input && !input.value)
                          input.value = String(last[k]).replace(".", ",");
                      }
                  }
                : undefined
            }
          />
        ))}
      </div>
      {hint && <p className="form-hint">{hint}</p>}
      {extra.length > 0 && (
        <details className="more-fields" open={extra.some((f) => defaults?.[f.key] != null && !(f.legacyZero && defaults?.[f.key] === 0))}>
          <summary>
            Mais detalhes <span className="optional">· opcional</span>
            <ChevronDown size={16} aria-hidden />
          </summary>
          <div className="form-grid">
            {extra.map((f) => (
              <FieldInput key={f.key} f={f} value={defaults?.[f.key]} />
            ))}
          </div>
        </details>
      )}
      {kind === "Medidas" && (
        <p className="form-note">
          Fita horizontal, sem apertar. Cintura e abdômen são medidas
          diferentes. O BF por US Navy usa abdômen, pescoço e{" "}
          {profile(data).height
            ? `sua altura (${profile(data).height} cm).`
            : "a altura do seu perfil."}
        </p>
      )}
      {NOTES[kind] && <p className="form-note">{NOTES[kind]}</p>}
      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? "Salvando…" : kind === "Configurações" || kind === "Perfil" ? "Salvar" : "Salvar registro"}
      </button>
    </form>
  );
}
const CHECKIN_SCALES: Field[] = [
  scale("quality", "Qualidade do sono", "péssima", "ótima"),
  scale("energy", "Energia", "sem energia", "cheio de energia"),
  scale("fatigue", "Fadiga", "descansado", "exausto"),
  scale("soreness", "Dor muscular", "nenhuma", "muita dor"),
  scale("stress", "Estresse", "tranquilo", "muito estressado"),
  scale("hunger", "Fome", "sem fome", "fome o tempo todo"),
];
const CHECKIN_EXTRA: Field[] = [
  scale("motivation", "Motivação", "nenhuma", "muita", { optional: true }),
  scale("performance", "Disposição para treinar", "nenhuma", "total", { optional: true }),
  { key: "steps", label: "Passos", type: "int", min: 0, max: 80000, optional: true },
  { key: "bedtime", label: "Dormiu às", type: "time", optional: true },
  { key: "waketime", label: "Acordou às", type: "time", optional: true },
];
const sleepHours = (bed: string, wake: string) => {
  const [bh, bm] = bed.split(":").map(Number),
    [wh, wm] = wake.split(":").map(Number);
  const minutes = (wh * 60 + wm - (bh * 60 + bm) + 1440) % 1440;
  return Math.round((minutes / 60) * 10) / 10;
};
// Six taps and the hours slept. Nothing comes pre-answered: "copy the last
// check-in" is an explicit choice, and it never copies the hours.
function CheckinForm({
  data,
  save,
  busy,
  initial,
}: {
  data: Data;
  save: Save;
  busy: boolean;
  initial?: Draft;
}) {
  const previous = latest(data.daily_checkins.filter((x) => x.date < today())),
    [seed, setSeed] = useState<Draft | undefined>(initial),
    [version, setVersion] = useState(0),
    [problem, setProblem] = useState("");
  const hoursRef = useRef<HTMLInputElement>(null),
    bedRef = useRef<HTMLInputElement>(null),
    wakeRef = useRef<HTMLInputElement>(null);
  const fillHours = () => {
    const bed = bedRef.current?.value,
      wake = wakeRef.current?.value;
    if (bed && wake && hoursRef.current && !hoursRef.current.value)
      hoursRef.current.value = fmt(sleepHours(bed, wake));
  };
  const hoursField: Field = { key: "hours", label: "Horas dormidas", type: "decimal", min: 0, max: 14 };
  return (
    <form
      key={version}
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget),
          fields = [hoursField, ...CHECKIN_SCALES, ...CHECKIN_EXTRA],
          payload: Record<string, unknown> = { date: form.get("date") ?? today() };
        for (const f of fields) payload[f.key] = readField(form, f);
        const problems = validate(fields, payload);
        if (problems.length) return setProblem(problems.join(" · "));
        setProblem("");
        await save("daily_checkins", payload);
      }}
    >
      {previous && !initial && (
        <button
          type="button"
          className="repeat-chip"
          onClick={() => {
            const copy: Draft = {};
            for (const f of [...CHECKIN_SCALES, ...CHECKIN_EXTRA])
              if (f.type === "scale" && previous[f.key] != null)
                copy[f.key] = previous[f.key];
            setSeed(copy);
            setVersion((v) => v + 1);
          }}
        >
          <Copy size={15} aria-hidden /> Começar pelas respostas de{" "}
          {ago(previous.date)}
          <small>ajuste só o que mudou</small>
        </button>
      )}
      <div className="form-grid">
        <label>
          Data
          <input
            name="date"
            type="date"
            defaultValue={initial?.date ?? today()}
            max={today()}
            required
          />
        </label>
        <label>
          Horas dormidas
          <DecimalInput
            ref={hoursRef}
            name="hours"
            placeholder="Ex.: 7,5"
            defaultValue={seed?.hours != null ? fmt(seed.hours) : ""}
          />
        </label>
      </div>
      {CHECKIN_SCALES.map((f) => (
        <FieldInput key={f.key} f={f} value={seed?.[f.key]} />
      ))}
      <details className="more-fields" open={CHECKIN_EXTRA.some((f) => seed?.[f.key] != null)}>
        <summary>
          Mais detalhes <span className="optional">· opcional</span>
          <ChevronDown size={16} aria-hidden />
        </summary>
        {CHECKIN_EXTRA.filter((f) => f.type === "scale").map((f) => (
          <FieldInput key={f.key} f={f} value={seed?.[f.key]} />
        ))}
        <div className="form-grid">
          <FieldInput f={CHECKIN_EXTRA[2]} value={seed?.steps} />
          <label>
            Dormiu às <span className="optional">· opcional</span>
            <input ref={bedRef} type="time" name="bedtime" defaultValue={seed?.bedtime ?? ""} onBlur={fillHours} />
          </label>
          <label>
            Acordou às <span className="optional">· opcional</span>
            <input ref={wakeRef} type="time" name="waketime" defaultValue={seed?.waketime ?? ""} onBlur={fillHours} />
          </label>
        </div>
      </details>
      <p className="form-note">
        Leva menos de um minuto. Passos ficam em branco quando não foram
        contados; em branco não vira zero.
      </p>
      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? "Salvando…" : "Salvar check-in"}
      </button>
    </form>
  );
}
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
type Line = { foodId: string; grams: number };
// Meals already logged under a slot, newest first, without repeats of the
// same combination: the usual breakfast is one tap away.
export function recentMeals(data: Data, name: string, limit = 3) {
  const seen = new Set<string>(),
    out: Row[] = [];
  const from = shift(today(), -45);
  for (const meal of [...data.meals]
    .filter((m) => m.name === name && m.date >= from)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || String(b.time).localeCompare(String(a.time)),
    )) {
    const key = (meal.items ?? [])
      .map((i: MealItemInput) => `${i.foodId}:${i.grams}`)
      .sort()
      .join("|");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(meal);
    if (out.length === limit) break;
  }
  return out;
}
export function MealForm({
  data,
  save,
  busy,
  initial,
}: {
  data: Data;
  save: Save;
  busy: boolean;
  initial?: Draft;
}) {
  const [items, setItems] = useState<Line[]>(
      initial?.items?.map((x: MealItemInput) => ({
        foodId: x.foodId,
        grams: x.grams,
      })) ?? [],
    ),
    [name, setName] = useState<string>(initial?.name ?? slotAt().name),
    // Index of the line whose food is being changed, "new" while adding one,
    // or null when the search is closed.
    [picking, setPicking] = useState<number | "new" | null>(
      initial?.items?.length ? null : "new",
    ),
    [query, setQuery] = useState(""),
    [creating, setCreating] = useState(false),
    [problem, setProblem] = useState("");
  const food = (id: string) => data.foods.find((f) => f.id === id);
  // Usage and the last portion per food, from the meal history.
  const uses = new Map<string, number>(),
    lastGrams = new Map<string, number>();
  for (const meal of [...data.meals].sort((a, b) => b.date.localeCompare(a.date)))
    for (const item of meal.items ?? []) {
      uses.set(item.foodId, (uses.get(item.foodId) ?? 0) + 1);
      if (!lastGrams.has(item.foodId)) lastGrams.set(item.foodId, item.grams);
    }
  const words = norm(query).split(/\s+/).filter(Boolean);
  const results = data.foods
    .filter((f) => words.every((w) => norm(f.name).includes(w)))
    .sort(
      (a, b) =>
        (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  const chosen = items.filter((i) => food(i.foodId));
  const m = macros(
    chosen.map((i) => ({
      ...i,
      id: i.foodId,
      date: today(),
      ...foodMacros(food(i.foodId)!, i.grams),
    })),
  );
  const repeats = initial?.id ? [] : recentMeals(data, name);
  function pick(id: string) {
    const grams = lastGrams.get(id) ?? food(id)?.portion ?? 100;
    if (picking === "new") setItems([...items, { foodId: id, grams }]);
    else if (picking != null)
      setItems(items.map((x, j) => (j === picking ? { foodId: id, grams } : x)));
    setPicking(null);
    setQuery("");
    setCreating(false);
    setProblem("");
  }
  function openPicker(i: number | "new") {
    setPicking(i);
    setQuery("");
    setCreating(false);
  }
  const picker =
    picking == null ? null : creating ? (
      <NewFood
        name={query.trim().replace(/^./, (c) => c.toUpperCase())}
        save={save}
        busy={busy}
        onCreated={pick}
        onCancel={() => setCreating(false)}
      />
    ) : (
      <div className="food-picker">
        <input
          type="search"
          autoFocus={picking !== "new" || !!initial?.items?.length || !repeats.length}
          aria-label="Buscar alimento"
          placeholder="Buscar: arroz, frango, whey…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter picks the top match instead of submitting the meal.
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (results[0]) pick(results[0].id);
          }}
        />
        {results.length ? (
          <ul className="food-results" aria-label="Alimentos">
            {results.slice(0, query ? 40 : 12).map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => pick(r.id)}>
                  <span>{r.name}</span>
                  <small>
                    {uses.get(r.id)
                      ? `${fmt(lastGrams.get(r.id), 0)} g da última vez · ${uses.get(r.id)}×`
                      : `${fmt(r.calories, 0)} kcal e ${fmt(r.protein, 0)} g de proteína em ${fmt(r.portion, 0)} g`}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="food-empty">Nenhum alimento com “{query.trim()}” no seu banco.</p>
        )}
        <div className="food-picker-actions">
          <button type="button" className="text-button" onClick={() => setCreating(true)}>
            <Plus size={15} /> Cadastrar {query.trim() ? `“${query.trim()}”` : "alimento novo"}
          </button>
          {(items.length > 0 || picking !== "new") && (
            <button type="button" className="text-button quiet" onClick={() => setPicking(null)}>
              Fechar busca
            </button>
          )}
        </div>
      </div>
    );
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!chosen.length) return setProblem("Escolha pelo menos um alimento.");
        if (chosen.some((i) => !(i.grams >= 1 && i.grams <= 2000)))
          return setProblem("Quantidade entre 1 e 2000 g em cada alimento.");
        const f = new FormData(e.currentTarget);
        save("meals", {
          ...(initial?.id ? { id: initial.id } : {}),
          date: f.get("date"),
          time: f.get("time"),
          name,
          items: chosen,
        });
      }}
    >
      <div className="form-grid meal-head">
        <label>
          Refeição
          <select name="name" value={name} onChange={(e) => setName(e.target.value)}>
            {[...MEAL_SLOTS.map((s) => s.name), "Refeição livre"].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Data
          <input type="date" name="date" max={today()} defaultValue={initial?.date ?? today()} required />
        </label>
        <label>
          Horário
          <input type="time" name="time" defaultValue={initial?.time ?? nowTime()} required />
        </label>
      </div>
      {repeats.length > 0 && items.length === 0 && (
        <div className="repeat-list" role="group" aria-label={`Repetir ${name.toLowerCase()}`}>
          <span>
            <History size={15} aria-hidden /> Repetir {name.toLowerCase()}
          </span>
          {repeats.map((meal) => (
            <button
              type="button"
              key={meal.id}
              className="repeat-chip"
              onClick={() => {
                setItems(
                  meal.items
                    .filter((i: MealItemInput) => food(i.foodId))
                    .map((i: MealItemInput) => ({ foodId: i.foodId, grams: i.grams })),
                );
                setPicking(null);
              }}
            >
              {meal.items.map((i: Row) => i.name).join(", ")}
              <small>
                {ago(meal.date)} · {fmt(meal.calories, 0)} kcal · {fmt(meal.protein, 0)} g P
              </small>
            </button>
          ))}
        </div>
      )}
      {items.map((item, i) => {
        const current = food(item.foodId);
        return (
          <div className="food-entry" key={i}>
            <div className="food-line">
              <div className="food-field">
                <span id={`food-label-${i}`}>Alimento</span>
                <button
                  type="button"
                  className={"food-choice" + (picking === i ? " open" : "")}
                  aria-expanded={picking === i}
                  aria-labelledby={`food-label-${i} food-name-${i}`}
                  onClick={() => (picking === i ? setPicking(null) : openPicker(i))}
                >
                  <span id={`food-name-${i}`}>{current?.name ?? "Alimento indisponível"}</span>
                  <ChevronDown size={16} aria-hidden />
                </button>
              </div>
              <label>
                g / ml
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="2000"
                  value={item.grams || ""}
                  onChange={(e) =>
                    setItems(items.map((x, j) => (j === i ? { ...x, grams: Number(e.target.value) } : x)))
                  }
                  required
                />
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label={`Remover ${current?.name ?? "alimento"}`}
                onClick={() => {
                  setItems(items.filter((_, j) => j !== i));
                  setPicking(items.length === 1 ? "new" : null);
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            {picking === i && picker}
          </div>
        );
      })}
      {picking === "new" ? (
        picker
      ) : (
        <button type="button" className="button" onClick={() => openPicker("new")}>
          <Plus size={16} /> Adicionar alimento
        </button>
      )}
      {chosen.length > 0 && (
        <div className="macro-summary" aria-live="polite">
          <b>{fmt(m.calories, 0)} kcal</b>
          <span>{fmt(m.protein, 0)} g P</span>
          <span>{fmt(m.carbs, 0)} g C</span>
          <span>{fmt(m.fat, 0)} g G</span>
        </div>
      )}
      <p className="form-note">
        Peso do alimento pronto. Valores estimados: confira o preparo e o
        rótulo dos produtos sem lactose.
      </p>
      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
      <button disabled={busy} className="button primary">
        {busy ? "Salvando…" : "Salvar refeição"}
      </button>
    </form>
  );
}
// Inline food registration inside the meal form. Not a <form>: it lives inside
// the meal's form, and saves without closing the dialog.
function NewFood({
  name,
  save,
  busy,
  onCreated,
  onCancel,
}: {
  name: string;
  save: Save;
  busy: boolean;
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState({
      name,
      portion: "100",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
    }),
    [problem, setProblem] = useState("");
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues({ ...values, [key]: e.target.value });
  async function create() {
    const title = values.name.trim(),
      numbers = (["portion", "calories", "protein", "carbs", "fat"] as const).map(
        (k) => parseDecimal(values[k]) ?? NaN,
      );
    if (!title) return setProblem("Dê um nome ao alimento.");
    if (numbers.some((x) => Number.isNaN(x) || x < 0) || numbers[0] < 1)
      return setProblem(
        "Preencha porção, calorias e macros. Use 0 quando o rótulo não tiver o nutriente.",
      );
    const [portion, calories, protein, carbs, fat] = numbers,
      id = crypto.randomUUID();
    const ok = await save(
      "foods",
      {
        id,
        name: title,
        portion,
        calories,
        protein,
        carbs,
        fat,
        fiber: 0,
        sodium: 0,
        source: "Cadastrado por você a partir do rótulo ou do preparo.",
      },
      { keepOpen: true, notice: `${title} entrou no seu banco de alimentos.` },
    );
    if (ok) onCreated(id);
  }
  return (
    <div
      className="new-food"
      onKeyDown={(e) => {
        // Enter saves the food, never the whole meal.
        if (e.key !== "Enter") return;
        e.preventDefault();
        void create();
      }}
    >
      <h3>Novo alimento</h3>
      <label>
        Nome e preparo
        <input
          autoFocus={!name}
          value={values.name}
          onChange={set("name")}
          maxLength={100}
          placeholder="Ex.: Peito de peru fatiado"
        />
      </label>
      <div className="form-grid">
        {(
          [
            ["portion", "Porção do rótulo (g ou ml)"],
            ["calories", "Calorias (kcal)"],
            ["protein", "Proteína (g)"],
            ["carbs", "Carboidratos (g)"],
            ["fat", "Gorduras (g)"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <DecimalInput
              value={values[key]}
              onChange={set(key)}
              autoFocus={!!name && key === "calories"}
            />
          </label>
        ))}
      </div>
      <p className="form-note">
        Valores da porção indicada, como no rótulo. Fibra e sódio podem ser
        completados depois em Alimentação.
      </p>
      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
      <div className="new-food-actions">
        <button type="button" className="button primary" disabled={busy} onClick={() => void create()}>
          {busy ? "Salvando…" : "Salvar e usar"}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Voltar à busca
        </button>
      </div>
    </div>
  );
}
