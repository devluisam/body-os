"use client";
import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  Data,
  Draft,
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
} from "@/lib/body";
// keepOpen: save without closing the dialog, for a record created mid-form.
export type SaveOptions = { keepOpen?: boolean; notice?: string };
export type Save = (
  table: Table,
  payload: Record<string, unknown>,
  options?: SaveOptions,
) => Promise<boolean>;
// [key, label, min | input type | select options, max, step, example value]
type Field = [
  key: string,
  label: string,
  type?: number | string | readonly string[],
  max?: number,
  step?: number,
  example?: number,
];
const measureFields: Field[] = [
  ["waist", "Cintura", 30, 200],
  ["abdomen", "Abdômen (umbigo)", 30, 200],
  ["neck", "Pescoço", 15, 80],
  ["chest", "Peito"],
  ["armRight", "Braço direito"],
  ["armLeft", "Braço esquerdo"],
  ["thighRight", "Coxa direita"],
  ["thighLeft", "Coxa esquerda"],
  ["hip", "Quadril"],
];
// These defaults are examples, never values: they show as placeholders so nothing unconfirmed gets saved.
const EXAMPLE_ONLY = new Set(["weight", "limit", "gi", "reference"]);
const formFields: Record<string, Field[]> = {
  Peso: [["weight", "Peso sem kimono (kg)", 30, 250, 0.1, 85]],
  Medidas: measureFields,
  BF: [
    ["bf", "Gordura estimada (%)", 3, 60, 0.1],
    [
      "method",
      "Método",
      ["Bioimpedância", "Avaliação profissional", "Avaliação visual manual"],
    ],
  ],
  "Check-in": [
    ["hours", "Horas dormidas", 0, 14, 0.1, 8],
    ["quality", "Qualidade do sono (0–10)", 0, 10, 1, 7],
    ["hunger", "Fome (0–10)", 0, 10, 1, 5],
    ["energy", "Energia (0–10)", 0, 10, 1, 7],
    ["stress", "Estresse (0–10)", 0, 10, 1, 3],
    ["soreness", "Dor muscular (0–10)", 0, 10, 1, 3],
    ["motivation", "Motivação (0–10)", 0, 10, 1, 7],
    ["fatigue", "Fadiga (0–10)", 0, 10, 1, 3],
    ["performance", "Performance (0–10)", 0, 10, 1, 7],
    ["steps", "Passos", 0, 80000, 1, 0],
    ["bedtime", "Hora que dormiu", "time"],
    ["waketime", "Hora que acordou", "time"],
  ],
  "Jiu-Jitsu": [
    ["duration", "Duração (min)", 1, 300, 1, 120],
    ["rounds", "Rounds completos", 0, 50, 1, 0],
    ["roundMinutes", "Minutos por round", 1, 20, 1, 5],
    ["rpe", "Esforço / RPE (1–10)", 1, 10, 1, 7],
    ["cardio", "Cardio (0–10)", 0, 10, 1, 5],
    ["strength", "Força (0–10)", 0, 10, 1, 5],
    ["technique", "Técnica (0–10)", 0, 10, 1, 5],
    ["energy", "Energia (0–10)", 0, 10, 1, 5],
    ["recovery", "Recuperação entre rounds", 0, 10, 1, 5],
    ["performance", "Performance geral", 0, 10, 1, 5],
    ["fatigueAt", "Minutos até sentir fadiga", 0, 300, 1, 0],
    ["hr", "FC média (0 = não medida)", 0, 240, 1, 0],
    ["techniques", "Técnicas e sparring", "text"],
  ],
  Musculação: [
    ["duration", "Duração (min)", 1, 240, 1, 60],
    ["notes", "Notas do treino", "text"],
  ],
  Exercício: [
    ["exercise", "Exercício", "text"],
    ["load", "Carga (kg)", 0, 500, 0.5, 20],
    ["reps", "Repetições", 1, 100, 1, 10],
    ["sets", "Séries", 1, 30, 1, 3],
    ["rir", "RIR (repetições em reserva)", 0, 10, 1, 2],
    ["rpe", "Esforço / RPE", 1, 10, 1, 8],
  ],
  Cardio: [
    ["mode", "Modalidade", ["Bike", "Esteira", "Corrida", "Caminhada"]],
    ["type", "Tipo", ["Zona 2", "Intervalado", "Livre"]],
    ["duration", "Duração (min)", 1, 300, 1, 30],
    ["hr", "FC média (0 = não medida)", 0, 240, 1, 0],
    ["distance", "Distância (km)", 0, 100, 0.1, 0],
    ["speed", "Velocidade (km/h)", 0, 50, 0.1, 0],
    ["incline", "Inclinação (%)", 0, 30, 0.5, 0],
    ["rpe", "Esforço / RPE", 1, 10, 1, 4],
  ],
  Metas: [
    ["calories", "Calorias (kcal)", 1800, 5000, 50],
    ["protein", "Proteína (g)", 80, 250, 1],
    ["carbs", "Carboidratos (g)", 100, 800, 1],
    ["fat", "Gorduras (g)", 40, 180, 1],
    ["fiber", "Fibras (g)", 15, 60, 1],
  ],
  Alimento: [
    ["name", "Nome e preparo", "text"],
    ["portion", "Porção do rótulo (g ou ml)", 1, 1000, 1, 100],
    ["calories", "Calorias por porção", 0, 10000, 0.1, 0],
    ["protein", "Proteína por porção (g)", 0, 1000, 0.1, 0],
    ["carbs", "Carboidrato por porção (g)", 0, 1000, 0.1, 0],
    ["fat", "Gordura por porção (g)", 0, 1000, 0.1, 0],
    ["fiber", "Fibra por porção (g)", 0, 1000, 0.1, 0],
    ["sodium", "Sódio por porção (mg)", 0, 100000, 0.1, 0],
  ],
  Campeonato: [
    ["name", "Evento", "text"],
    ["eventDate", "Data do evento", "date"],
    ["category", "Categoria", "text"],
    ["limit", "Limite da categoria (kg)", 30, 200, 0.1, 82.3],
    ["withGi", "Pesagem", ["Com kimono", "Sem kimono"]],
    ["gi", "Peso estimado do kimono (kg)", 0, 5, 0.1, 2.3],
    ["weighDate", "Data da pesagem", "date"],
    ["weighTime", "Horário da pesagem", "time"],
    ["fightGap", "Minutos entre pesagem e luta", 0, 1440, 1, 30],
    ["reference", "Referência temporária sem kimono (kg)", 30, 200, 0.1, 80],
  ],
  Categoria: [
    ["name", "Nome da categoria", "text"],
    ["limit", "Limite (kg)", 30, 200, 0.1],
    ["withGi", "Pesagem", ["Com kimono", "Sem kimono"]],
  ],
  Configurações: [
    ["name", "Nome do sistema", "text"],
    ["phase", "Fase", PHASES],
    ["steps", "Meta de passos", 1000, 30000, 500],
    ["water", "Referência de água (ml)", 500, 6000, 100],
    ["bfGoal", "Meta de BF opcional (%)", 8, 40, 0.5],
    ["theme", "Aparência", ["dark", "light"]],
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
};
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
        <div className="tabs">
          {["Jiu-Jitsu", "Musculação", "Cardio"].map((k) => (
            <button
              className={mode === k ? "selected" : ""}
              key={k}
              onClick={() => setMode(k)}
            >
              {k}
            </button>
          ))}
        </div>
        <RecordForm
          key={mode}
          kind={mode}
          data={data}
          save={save}
          busy={busy}
        />
      </>
    );
  if (kind === "Refeição")
    return <MealForm data={data} save={save} busy={busy} initial={initial} />;
  const defaults: Draft | undefined =
    initial ??
    (kind === "Metas"
      ? targets(data)
      : kind === "Configurações"
        ? latest(data.settings)
        : {});
  const lastWeight = latest(data.weight_logs)?.weight as number | undefined;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          payload: Record<string, unknown> = {
            date: f.get("date") ?? today(),
          };
        for (const [key, , type] of formFields[kind]) {
          const v = f.get(key);
          payload[key] =
            typeof type === "number" || type === undefined
              ? v === ""
                ? undefined
                : Number(v)
              : v;
        }
        if (kind === "Campeonato" || kind === "Categoria")
          payload.withGi = payload.withGi === "Com kimono";
        if (kind === "Configurações") payload.bfGoal = payload.bfGoal ?? null;
        if (initial) payload.id = initial.id;
        await save(tables[kind], payload);
      }}
    >
      {!["Configurações", "Metas"].includes(kind) && (
        <label>
          Data do registro
          <input
            name="date"
            type="date"
            defaultValue={initial?.date ?? today()}
            max={today()}
            required
          />
        </label>
      )}
      <div className="form-grid">
        {formFields[kind]?.map(
          ([key, label, type, minMax, step, defaultValue]) => (
            <label key={key}>
              {label}
              {Array.isArray(type) ? (
                <select
                  name={key}
                  defaultValue={
                    key === "withGi"
                      ? defaults?.withGi
                        ? "Com kimono"
                        : "Sem kimono"
                      : (defaults?.[key] ?? type[0])
                  }
                >
                  {type.map((x) => (
                    <option key={x} value={x}>
                      {x === "dark" ? "Escuro" : x === "light" ? "Claro" : x}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  autoFocus={kind === "Peso" && key === "weight"}
                  name={key}
                  type={typeof type === "string" ? type : "number"}
                  min={typeof type === "number" ? type : 0}
                  max={minMax}
                  step={step ?? 0.1}
                  inputMode={
                    typeof type === "string"
                      ? undefined
                      : (step ?? 0.1) < 1
                        ? "decimal"
                        : "numeric"
                  }
                  defaultValue={
                    defaults?.[key] ??
                    (EXAMPLE_ONLY.has(key) ? "" : (defaultValue ?? ""))
                  }
                  placeholder={
                    !EXAMPLE_ONLY.has(key)
                      ? undefined
                      : key === "weight" && lastWeight
                        ? `Última: ${fmt(lastWeight)}`
                        : defaultValue != null
                          ? `Ex.: ${fmt(defaultValue)}`
                          : undefined
                  }
                  required={
                    key !== "bfGoal" &&
                    (!["Medidas"].includes(kind) ||
                      ["waist", "abdomen", "neck"].includes(key)) &&
                    !["bedtime", "waketime"].includes(key)
                  }
                />
              )}
            </label>
          ),
        )}
      </div>
      {kind === "Medidas" && (
        <p>
          Medidas em cm. Abdômen na altura do umbigo, fita horizontal e sem
          apertar. Cintura e abdômen são registros distintos. US Navy estima BF
          com abdômen, pescoço e{" "}
          {profile(data).height
            ? `altura de ${profile(data).height} cm.`
            : "a altura do seu perfil."}
        </p>
      )}
      {kind === "BF" && (
        <p>
          Estimativa aproximada. Não compare métodos como se tivessem a mesma
          precisão.
        </p>
      )}
      {kind === "Metas" && (
        <p>
          O ponto inicial usa Mifflin–St Jeor e atividade estimada. Calibre com
          registros reais. Alterações só entram em vigor ao salvar.
        </p>
      )}
      {kind === "Configurações" && (
        <p>
          A fase só muda quando você salvar. A meta de BF pode ficar vazia. Água
          é uma referência ajustável, sem obrigação de beber além da
          necessidade.
        </p>
      )}
      {kind === "Campeonato" && (
        <p>
          Confirme as regras com a organização. O sistema não recomenda
          desidratação para entrar numa categoria.
        </p>
      )}
      {kind === "Peso" && (
        <p>
          Use condições semelhantes: pela manhã, após ir ao banheiro. Um
          registro por dia; salvar novamente atualiza a pesagem desse dia.
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? "Salvando…" : "Salvar registro"}
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
      })) ?? [
        {
          foodId:
            (data.foods.find((f) => f.id === "food-0") ?? data.foods[0])?.id ??
            "",
          grams: 150,
        },
      ],
    ),
    // Index of the line whose food is being chosen; null when no picker is open.
    [picking, setPicking] = useState<number | null>(null),
    [query, setQuery] = useState(""),
    [creating, setCreating] = useState(false),
    [problem, setProblem] = useState("");
  const food = (id: string) => data.foods.find((f) => f.id === id);
  // Foods logged most often come first, so the usual meal is a tap away.
  const uses = new Map<string, number>();
  for (const meal of data.meals)
    for (const item of meal.items ?? [])
      uses.set(item.foodId, (uses.get(item.foodId) ?? 0) + 1);
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
  function update(i: number, patch: Partial<Line>) {
    setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  function openPicker(i: number) {
    setPicking(i);
    setQuery("");
    setCreating(false);
  }
  function closePicker() {
    // A line added but never given a food goes away instead of lingering blank.
    if (picking != null && !items[picking]?.foodId && items.length > 1)
      setItems(items.filter((_, j) => j !== picking));
    setPicking(null);
    setCreating(false);
  }
  function pick(id: string) {
    if (picking == null) return;
    update(picking, { foodId: id });
    setPicking(null);
    setCreating(false);
    setProblem("");
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!chosen.length) {
          setProblem("Escolha pelo menos um alimento.");
          return;
        }
        const f = new FormData(e.currentTarget);
        save("meals", {
          ...(initial?.id ? { id: initial.id } : {}),
          date: f.get("date"),
          time: f.get("time"),
          name: f.get("name"),
          items: chosen,
        });
      }}
    >
      <div className="form-grid">
        <label>
          Refeição
          <select name="name" defaultValue={initial?.name ?? slotAt().name}>
            {[...MEAL_SLOTS.map((s) => s.name), "Refeição livre"].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Data
          <input
            type="date"
            name="date"
            max={today()}
            defaultValue={initial?.date ?? today()}
            required
          />
        </label>
        <label>
          Horário
          <input
            type="time"
            name="time"
            defaultValue={
              initial?.time ??
              new Intl.DateTimeFormat("pt-BR", {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date())
            }
            required
          />
        </label>
      </div>
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
                  onClick={() => (picking === i ? closePicker() : openPicker(i))}
                >
                  <span id={`food-name-${i}`}>
                    {current?.name ?? "Escolher alimento"}
                  </span>
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
                  value={item.grams}
                  onChange={(e) => update(i, { grams: Number(e.target.value) })}
                  required
                />
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label="Remover alimento"
                disabled={items.length === 1}
                onClick={() => {
                  setItems(items.filter((_, j) => j !== i));
                  setPicking(null);
                  setCreating(false);
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            {picking === i &&
              (creating ? (
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
                    autoFocus
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
                      {results.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            aria-current={
                              r.id === item.foodId ? "true" : undefined
                            }
                            onClick={() => pick(r.id)}
                          >
                            <span>{r.name}</span>
                            <small>
                              {fmt(r.calories, 0)} kcal ·{" "}
                              {fmt(r.protein, 0)} g proteína em{" "}
                              {fmt(r.portion, 0)} g
                              {uses.get(r.id)
                                ? ` · usado ${uses.get(r.id)}×`
                                : ""}
                            </small>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="food-empty">
                      Nenhum alimento com “{query.trim()}” no seu banco.
                    </p>
                  )}
                  <div className="food-picker-actions">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setCreating(true)}
                    >
                      <Plus size={15} /> Cadastrar{" "}
                      {query.trim() ? `“${query.trim()}”` : "alimento novo"}
                    </button>
                    <button
                      type="button"
                      className="text-button quiet"
                      onClick={closePicker}
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ))}
          </div>
        );
      })}
      <button
        type="button"
        className="button"
        onClick={() => {
          setItems([...items, { foodId: "", grams: 100 }]);
          openPicker(items.length);
        }}
      >
        <Plus size={16} /> Adicionar alimento
      </button>
      <div className="macro-summary">
        <b>{fmt(m.calories, 0)} kcal</b>
        <span>{fmt(m.protein, 0)} g P</span>
        <span>{fmt(m.carbs, 0)} g C</span>
        <span>{fmt(m.fat, 0)} g G</span>
        <span>{fmt(m.fiber, 0)} g fibras</span>
      </div>
      <p>
        Valores estimados. Confira o preparo e use o rótulo para produtos sem
        lactose. Peso do alimento pronto, salvo indicação no nome.
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
        (k) => (values[k] === "" ? NaN : Number(values[k])),
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
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={values[key]}
              onChange={set(key)}
              autoFocus={!!name && key === "calories"}
            />
          </label>
        ))}
      </div>
      <p>
        Valores da porção indicada, como no rótulo. Fibra e sódio podem ser
        completados depois em Alimentação.
      </p>
      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
      <div className="new-food-actions">
        <button
          type="button"
          className="button primary"
          disabled={busy}
          onClick={() => void create()}
        >
          {busy ? "Salvando…" : "Salvar e usar"}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Voltar à busca
        </button>
      </div>
    </div>
  );
}
