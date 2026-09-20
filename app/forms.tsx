"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Data,
  Row,
  Table,
  today,
  PHASES,
  composition,
  targets,
  latest,
  fmt,
  foodMacros,
  macros,
  mealIdea,
} from "@/lib/body";
export type Save = (
  table: Table,
  payload: Record<string, unknown>,
) => Promise<boolean>;
const measureFields = [
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
const formFields: Record<string, any[]> = {
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
  initial?: Row;
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
  const defaults: Record<string, any> =
    initial ??
    (kind === "Metas"
      ? targets(data)
      : kind === "Configurações"
        ? latest(data.settings)
        : kind === "Peso"
          ? { weight: composition(data).weight }
          : {});
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          payload: Record<string, any> = { date: f.get("date") ?? today() };
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
                  defaultValue={defaults?.[key] ?? defaultValue ?? ""}
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
          com abdômen, pescoço e altura de 177 cm.
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
export function MealForm({
  data,
  save,
  busy,
  initial,
}: {
  data: Data;
  save: Save;
  busy: boolean;
  initial?: Row;
}) {
  const [items, setItems] = useState<{ foodId: string; grams: number }[]>(
      initial?.items?.map((x: any) => ({
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
    [search, setSearch] = useState("");
  const detailed = items.map((i) => ({
    ...i,
    id: i.foodId,
    date: today(),
    ...foodMacros(
      data.foods.find((f) => f.id === i.foodId) ?? data.foods[0],
      i.grams,
    ),
  }));
  const m = macros(detailed);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save("meals", {
          ...(initial ? { id: initial.id } : {}),
          date: f.get("date"),
          time: f.get("time"),
          name: f.get("name"),
          items,
        });
      }}
    >
      <div className="form-grid">
        <label>
          Refeição
          <select name="name" defaultValue={initial?.name ?? "Almoço"}>
            {[
              "Café da manhã",
              "Almoço",
              "Lanche",
              "Jantar",
              "Ceia",
              "Refeição livre",
            ].map((n) => (
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
      <label>
        Buscar alimento
        <input
          placeholder="Ex.: arroz, frango, leite sem lactose"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {items.map((item, i) => (
        <div className="food-line" key={i}>
          <label>
            Alimento
            <select
              value={item.foodId}
              onChange={(e) =>
                setItems(
                  items.map((x, j) =>
                    j === i ? { ...x, foodId: e.target.value } : x,
                  ),
                )
              }
            >
              {data.foods
                .filter(
                  (f) =>
                    f.id === item.foodId ||
                    f.name.toLowerCase().includes(search.toLowerCase()),
                )
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            g / ml
            <input
              type="number"
              min="1"
              max="2000"
              value={item.grams}
              onChange={(e) =>
                setItems(
                  items.map((x, j) =>
                    j === i ? { ...x, grams: Number(e.target.value) } : x,
                  ),
                )
              }
              required
            />
          </label>
          <button
            type="button"
            className="icon-button"
            aria-label="Remover alimento"
            disabled={items.length === 1}
            onClick={() => setItems(items.filter((_, j) => j !== i))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button"
        onClick={() =>
          setItems([
            ...items,
            {
              foodId: (
                data.foods.find((f) => f.id === "food-6") ?? data.foods[0]
              ).id,
              grams: 100,
            },
          ])
        }
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
      <button disabled={busy} className="button primary">
        {busy ? "Salvando…" : "Salvar refeição"}
      </button>
    </form>
  );
}
