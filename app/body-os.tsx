"use client";
import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import {
  Activity,
  BarChart3,
  Dumbbell,
  Heart,
  Home,
  Menu,
  Scale,
  Settings,
  Sparkles,
  Trophy,
  Utensils,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Data,
  Draft,
  Table,
  latest,
  today,
  days,
  fmt,
  PHASES,
} from "@/lib/body";
import { RecordForm, type SaveOptions } from "./forms";
import {
  enqueue,
  synchronize,
  project,
  discardPending,
  SyncError,
  type Pending,
} from "@/lib/offline";
import {
  Overview,
  Nutrition,
  Body,
  Training,
  Recovery,
  Competition,
  Reports,
  Assistant,
  SettingsView,
  type ViewProps,
} from "./views";
const navigation = [
  ["Visão geral", Home],
  ["Alimentação", Utensils],
  ["Composição corporal", Scale],
  ["Treinos", Dumbbell],
  ["Recuperação", Heart],
  ["Campeonato", Trophy],
  ["Relatório semanal", BarChart3],
  ["Assistente", Sparkles],
  ["Configurações", Settings],
] as const;
// Each load failure gets its own recovery: only an expired session offers sign-in.
const FAILURES = {
  auth: {
    title: "Sua sessão expirou",
    body: "Entre novamente para ver e sincronizar seus registros.",
  },
  server: {
    title: "O servidor não respondeu",
    body: "Nenhum registro foi apagado. Tente de novo em alguns instantes.",
  },
  network: {
    title: "Sem conexão",
    body: "Verifique a internet. Depois de abrir o app conectado uma vez, peso, refeições, treinos e check-ins funcionam offline neste aparelho.",
  },
  account: {
    title: "Conta não confirmada",
    body: "Não foi possível confirmar a conta. Atualize o aplicativo e tente de novo.",
  },
} as const;
type Failure = keyof typeof FAILURES;
// The URL hash is the source of truth for the open section, so the browser
// back button and iOS back-swipe move between sections.
const HOME = "Visão geral";
function hashPage() {
  const h = decodeURIComponent(location.hash.slice(1));
  return navigation.some(([n]) => n === h) ? h : HOME;
}
function onNavigate(notify: () => void) {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
}
const TABLE_LABELS: Partial<Record<Table, string>> = {
  weight_logs: "Peso",
  meals: "Refeição",
  jiujitsu_sessions: "Treino de Jiu-Jitsu",
  gym_sessions: "Musculação",
  gym_exercises: "Exercício",
  cardio_sessions: "Cardio",
  daily_checkins: "Check-in",
  body_measurements: "Medidas",
  competition_events: "Evento",
  competition_categories: "Categoria",
  nutrition_targets: "Metas",
  foods: "Alimento",
  settings: "Configurações",
};
function longDate(date: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(date + "T12:00:00Z"));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
export default function BodyOS() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState<Failure | null>(null),
    [retrying, setRetrying] = useState(false),
    page = useSyncExternalStore(onNavigate, hashPage, () => HOME),
    [menu, setMenu] = useState(false),
    [modal, setModal] = useState(""),
    [initial, setInitial] = useState<Draft | undefined>(),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState<Pending[]>([]),
    [online, setOnline] = useState(true),
    [question, setQuestion] = useState<{
      text: string;
      action: string;
      detail: string;
      answer: (ok: boolean) => void;
    } | null>(null);
  // In-app replacement for window.confirm: themed, and a bottom sheet on phones.
  function ask(
    text: string,
    action = "Excluir",
    detail = "Essa ação não pode ser desfeita.",
  ) {
    return new Promise<boolean>((answer) =>
      setQuestion({ text, action, detail, answer }),
    );
  }
  function reply(ok: boolean) {
    question?.answer(ok);
    setQuestion(null);
  }
  function refresh() {
    return synchronize().then(
      (result) => {
        setData(project(result.cache.data, result.cache.pending));
        setPending(result.cache.pending);
        setOnline(result.online);
        setError(null);
      },
      (e) => {
        setData(null);
        setError(e instanceof SyncError ? e.kind : "network");
      },
    );
  }
  async function retry() {
    setRetrying(true);
    await refresh();
    setRetrying(false);
  }
  useEffect(() => {
    refresh();
    const warmCache = () =>
      navigator.serviceWorker.controller?.postMessage({
        type: "CACHE_ASSETS",
        urls: performance.getEntriesByType("resource").map((r) => r.name),
      });
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.addEventListener("controllerchange", warmCache);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then((reg) => {
          reg.active?.postMessage({
            type: "CACHE_ASSETS",
            urls: performance.getEntriesByType("resource").map((r) => r.name),
          });
        })
        .catch(() => {});
    const retry = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    const timer = setInterval(retry, 60000);
    return () => {
      if ("serviceWorker" in navigator)
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          warmCache,
        );
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme =
      latest(data?.settings ?? [])?.theme ?? "dark";
    document.title =
      (latest(data?.settings ?? [])?.name ?? "BODY OS") + " · " + page;
  }, [data, page]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 6500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  function go(n: string) {
    setMenu(false);
    if (n !== page) {
      history.pushState(null, "", "#" + encodeURIComponent(n));
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    window.scrollTo({ top: 0 });
  }
  function open(n: string, row?: Draft) {
    setInitial(row);
    setModal(n);
  }
  async function save(
    table: Table,
    payload: Record<string, unknown>,
    options: SaveOptions = {},
  ) {
    if (busy) return false;
    setBusy(true);
    try {
      const cache = await enqueue(table, payload);
      setData(project(cache.data, cache.pending));
      setPending(cache.pending);
      if (!options.keepOpen) setModal("");
      setNotice(
        options.notice ??
          "Registro salvo no dispositivo. Sincronização pendente.",
      );
      void refresh();
      return true;
    } catch (e) {
      setNotice(String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function remove(table: Table, id: string) {
    if (pending.length) {
      setNotice(
        "Sincronize ou resolva os registros pendentes antes de excluir.",
      );
      return;
    }
    if (!(await ask("Excluir este registro?"))) return;
    try {
      const r = await fetch("/api/data", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table, id }),
        }),
        j = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(j.error);
      await refresh();
      setNotice("Registro excluído.");
    } catch (e) {
      setNotice(String(e));
    }
  }
  const name = latest(data?.settings ?? [])?.name ?? "BODY OS",
    phase = latest(data?.settings ?? [])?.phase ?? PHASES[0],
    weighed = data?.weight_logs.find((w) => w.date === today()),
    event = data?.competition_events.find(
      (e) => !e.archived && e.eventDate >= today(),
    ),
    goal =
      data?.goals.find((g) => g.active && g.type === "principal") ??
      data?.goals.find((g) => g.active),
    views: Record<string, ComponentType<ViewProps>> = {
      "Visão geral": Overview,
      Alimentação: Nutrition,
      "Composição corporal": Body,
      Treinos: Training,
      Recuperação: Recovery,
      Campeonato: Competition,
      "Relatório semanal": Reports,
      Assistente: Assistant,
      Configurações: SettingsView,
    },
    View = views[page] ?? Overview;
  return (
    <div className="app">
      {menu && (
        <button
          className="nav-scrim"
          onClick={() => setMenu(false)}
          aria-label="Fechar menu"
        />
      )}
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <button className="brand" onClick={() => go(HOME)}>
          <span className="brand-icon">
            <Activity size={25} />
          </span>
          {name}
        </button>
        <nav aria-label="Seções">
          {navigation.map(([n, Icon]) => (
            <button
              key={n}
              onClick={() => go(n)}
              className={page === n ? "active" : ""}
              aria-current={page === n ? "page" : undefined}
            >
              <Icon size={19} />
              {n}
            </button>
          ))}
        </nav>
        {data && (
          <div className="sidebar-bottom">
            <small>Fase atual</small>
            <span className="pill">{phase}</span>
          </div>
        )}
      </aside>
      <div className="workspace-main">
        <header className="topbar mobile-only">
          <span className="topbar-brand">
            <Activity size={20} /> {name}
          </span>
          {data && <span className="pill">{phase}</span>}
        </header>
        <main>
          <div className="page-heading">
            <div>
              <h1>{page === HOME ? longDate(today()) : page}</h1>
              {page === HOME && data && (weighed || event) && (
                <p className="today-status">
                  {weighed && (
                    <span>
                      Pesagem de hoje: <strong>{fmt(weighed.weight)} kg</strong>
                    </span>
                  )}
                  {event && (
                    <span>
                      <strong>{days(event.eventDate, today())} dias</strong> até{" "}
                      {event.name}
                    </span>
                  )}
                </p>
              )}
              {page === HOME && goal && <p>Objetivo: {goal.title}</p>}
            </div>
          </div>
          {data && (!online || pending.length > 0) && (
            <div className="card" role="status" style={{ marginBottom: 20 }}>
              <strong>{online ? "Sincronização" : "Você está offline"}</strong>
              <p>
                {pending.length} registro(s) pendente(s). Os dados deste
                dispositivo podem estar mais recentes que os do servidor. Fotos,
                exclusões e chat precisam de conexão.
              </p>
              <button className="button" onClick={refresh}>
                Sincronizar agora
              </button>
              {pending
                .filter((p) => p.error)
                .map((p) => (
                  <div key={p.mutationId}>
                    <p>
                      {TABLE_LABELS[p.table as Table] ?? "Registro"} de{" "}
                      {p.data.date}: {p.error}
                    </p>
                    <details>
                      <summary>Ver dados técnicos</summary>
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {JSON.stringify(p.data, null, 2)}
                      </pre>
                    </details>
                    <button
                      className="button"
                      onClick={async () => {
                        if (
                          await ask(
                            "Descartar a alteração local?",
                            "Descartar",
                            "O registro do servidor passa a valer neste aparelho.",
                          )
                        ) {
                          await discardPending(p.mutationId);
                          await refresh();
                        }
                      }}
                    >
                      Descartar alteração local
                    </button>
                  </div>
                ))}
            </div>
          )}
          {error ? (
            <div className="card load-failure" role="alert">
              <h2>{FAILURES[error].title}</h2>
              <p>{FAILURES[error].body}</p>
              <div className="actions">
                {error === "auth" && (
                  <a
                    className="button primary"
                    href="/signin-with-chatgpt?return_to=/"
                    target="_top"
                  >
                    Entrar
                  </a>
                )}
                <button
                  className="button"
                  onClick={retry}
                  disabled={retrying}
                >
                  {retrying ? "Tentando…" : "Tentar novamente"}
                </button>
              </div>
            </div>
          ) : !data ? (
            <div className="card" role="status">
              Carregando seus registros…
            </div>
          ) : (
            <View
              key={page}
              data={data}
              open={open}
              save={save}
              refresh={refresh}
              notice={setNotice}
              go={go}
              remove={remove}
              ask={ask}
            />
          )}
        </main>
      </div>
      <nav className="dock" aria-label="Atalhos">
        <button
          onClick={() => go(HOME)}
          aria-current={page === HOME ? "page" : undefined}
        >
          <Home size={21} />
          Hoje
        </button>
        {(
          [
            ["Peso", Scale],
            ["Refeição", Utensils],
            ["Check-in", Heart],
          ] as const
        ).map(([label, Icon]) => (
          <button key={label} onClick={() => open(label)} disabled={!data}>
            <Icon size={21} />
            {label}
          </button>
        ))}
        <button onClick={() => setMenu(true)} aria-expanded={menu}>
          <Menu size={21} />
          Menu
        </button>
      </nav>
      <Dialog
        open={!!modal}
        onOpenChange={(v) => {
          if (!v && !busy) setModal("");
        }}
      >
        <DialogContent className="body-dialog">
          <DialogTitle>
            {initial?.id ? "Editar" : "Registrar"} {modal.toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Fica salvo neste aparelho e sincroniza quando houver conexão.
          </DialogDescription>
          {data && modal && (
            <RecordForm
              key={modal + (initial?.id ?? initial?.name ?? "")}
              kind={modal}
              data={data}
              save={save}
              busy={busy}
              initial={initial}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!question}
        onOpenChange={(v) => {
          if (!v) reply(false);
        }}
      >
        <DialogContent className="body-dialog confirm-dialog">
          <DialogTitle>{question?.text}</DialogTitle>
          <DialogDescription>{question?.detail}</DialogDescription>
          <div className="confirm-actions">
            <button className="button" onClick={() => reply(false)}>
              Cancelar
            </button>
            <button className="button danger" onClick={() => reply(true)}>
              {question?.action}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {notice && (
        <div role="status" className="toast">
          <span>{notice}</span>
          <button
            className="icon-button"
            onClick={() => setNotice("")}
            aria-label="Fechar aviso"
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
