"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import {
  Activity,
  BarChart3,
  CloudOff,
  Dumbbell,
  Heart,
  Home,
  Menu,
  RefreshCw,
  Scale,
  Settings,
  Sparkles,
  Trophy,
  Utensils,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Data, Draft, Table, latest, today, days, fmt, PHASES, weightStatus } from "@/lib/body";
import { RecordForm, formTitle, type SaveOptions } from "./forms";
import { enqueue, synchronize, project, discardPending, SyncError, type Pending } from "@/lib/offline";
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
  type ImportRow,
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
  nutrition_days: "Dia fechado",
  foods: "Alimento",
  settings: "Configurações",
  users: "Perfil",
  goals: "Objetivo",
  water_logs: "Água",
};
const SAVED: Partial<Record<Table, string>> = {
  weight_logs: "Pesagem salva.",
  meals: "Refeição salva.",
  daily_checkins: "Check-in salvo.",
  jiujitsu_sessions: "Treino salvo.",
  gym_sessions: "Treino salvo.",
  gym_exercises: "Exercício salvo.",
  cardio_sessions: "Cardio salvo.",
  body_measurements: "Medidas salvas.",
  body_metrics: "BF salvo.",
  users: "Perfil salvo.",
  settings: "Configurações salvas.",
  nutrition_targets: "Metas salvas.",
  goals: "Objetivo salvo.",
  competition_events: "Evento salvo.",
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
const clock = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
// Errors reach the screen as their message, never as "Error: …".
const text = (e: unknown) => (e instanceof Error ? e.message : String(e));
type Sync = { online: boolean; updated: string | null; syncing: boolean };
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
    [sync, setSync] = useState<Sync>({ online: true, updated: null, syncing: false }),
    [question, setQuestion] = useState<{
      text: string;
      action: string;
      detail: string;
      answer: (ok: boolean) => void;
    } | null>(null);
  const running = useRef<Promise<{ online: boolean; pending: Pending[] } | null> | null>(null);
  // In-app replacement for window.confirm: themed, and a bottom sheet on phones.
  function ask(text: string, action = "Excluir", detail = "Essa ação não pode ser desfeita.") {
    return new Promise<boolean>((answer) => setQuestion({ text, action, detail, answer }));
  }
  function reply(ok: boolean) {
    question?.answer(ok);
    setQuestion(null);
  }
  // One sync at a time per tab; callers share the run already in flight.
  function refresh() {
    running.current ??= (async () => {
      setSync((s) => ({ ...s, syncing: true }));
      try {
        const result = await synchronize();
        // An unchanged account keeps the same object, so nothing re-renders.
        setData((prev) =>
          result.changed || !prev ? project(result.cache.data, result.cache.pending) : prev,
        );
        setPending(result.cache.pending);
        setSync({ online: result.online, updated: result.cache.updated, syncing: false });
        setError(null);
        return { online: result.online, pending: result.cache.pending };
      } catch (e) {
        setSync((s) => ({ ...s, syncing: false }));
        setData(null);
        setError(e instanceof SyncError ? e.kind : "network");
        return null;
      } finally {
        running.current = null;
      }
    })();
    return running.current;
  }
  async function retry() {
    setRetrying(true);
    await refresh();
    setRetrying(false);
  }
  useEffect(() => {
    refresh();
    const urls = () => performance.getEntriesByType("resource").map((r) => r.name);
    const warmCache = () =>
      navigator.serviceWorker.controller?.postMessage({ type: "CACHE_ASSETS", urls: urls() });
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", warmCache);
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then((reg) => reg.active?.postMessage({ type: "CACHE_ASSETS", urls: urls() }))
        .catch(() => {});
    }
    const again = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const offline = () => setSync((s) => ({ ...s, online: false }));
    window.addEventListener("online", again);
    window.addEventListener("offline", offline);
    window.addEventListener("focus", again);
    document.addEventListener("visibilitychange", again);
    const timer = setInterval(again, 60000);
    return () => {
      if ("serviceWorker" in navigator)
        navigator.serviceWorker.removeEventListener("controllerchange", warmCache);
      window.removeEventListener("online", again);
      window.removeEventListener("offline", offline);
      window.removeEventListener("focus", again);
      document.removeEventListener("visibilitychange", again);
      clearInterval(timer);
    };
  }, []);
  const settings = latest(data?.settings ?? []);
  useEffect(() => {
    const theme = settings?.theme;
    if (theme) {
      document.documentElement.dataset.theme = theme;
      try {
        localStorage.setItem("bodyos-theme", theme);
      } catch {}
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", theme === "light" ? "#f3f5f2" : "#101412");
    }
    document.title = (settings?.name ?? "BODY OS") + " · " + page;
  }, [settings?.theme, settings?.name, page]);
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
  async function save(table: Table, payload: Record<string, unknown>, options: SaveOptions = {}) {
    if (busy) return false;
    setBusy(true);
    try {
      const cache = await enqueue(table, payload);
      setData(project(cache.data, cache.pending));
      setPending(cache.pending);
      if (!options.keepOpen) setModal("");
      const extra =
        table === "weight_logs" && !options.notice
          ? (() => {
              const w = weightStatus(project(cache.data, cache.pending).weight_logs);
              return w.mean != null ? ` Média de 7 dias: ${fmt(w.mean)} kg.` : ` ${w.week} de 3 pesagens para a média da semana.`;
            })()
          : "";
      setNotice((options.notice ?? "Salvo neste aparelho.") + extra + " Enviando…");
      // Tells the athlete where the record is once the sync settles.
      void refresh().then((result) => {
        if (!result) return;
        const label = options.notice ?? SAVED[table] ?? "Registro salvo.";
        setNotice(
          result.pending.some((p) => p.error)
            ? "Um registro precisa de revisão antes de sincronizar. Veja o aviso no topo."
            : result.pending.length
              ? `${label}${extra} Guardado neste aparelho; envia quando a conexão voltar.`
              : `${label}${extra} Sincronizado.`,
        );
      });
      return true;
    } catch (e) {
      setNotice(text(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  // Restoring a backup goes through the same offline queue and server
  // validation as any record, then syncs once at the end.
  async function importRows(rows: ImportRow[]) {
    let done = 0;
    try {
      for (const row of rows) {
        await enqueue(row.table, row.data);
        done++;
      }
    } catch (e) {
      setNotice(`${done} de ${rows.length} registros restaurados. Parou em: ${text(e)}`);
    }
    const result = await refresh();
    if (done === rows.length)
      setNotice(
        result?.pending.length
          ? `${done} registros restaurados neste aparelho; sincronizam quando houver conexão.`
          : `${done} registros restaurados e sincronizados.`,
      );
  }
  async function remove(table: Table, id: string) {
    if (pending.length) {
      setNotice("Sincronize ou resolva os registros pendentes antes de excluir.");
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
      setNotice(navigator.onLine === false ? "Excluir precisa de conexão. Nada foi apagado." : text(e));
    }
  }
  const name = settings?.name ?? "BODY OS",
    phase = settings?.phase ?? PHASES[0],
    event = data?.competition_events.find((e) => !e.archived && e.eventDate >= today()),
    goal = data?.goals.find((g) => g.active && g.type === "principal") ?? data?.goals.find((g) => g.active),
    conflicts = pending.filter((p) => p.error),
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
  const syncLabel = !sync.online
    ? pending.length
      ? `Offline · ${pending.length} no aparelho`
      : "Offline"
    : sync.syncing
      ? "Sincronizando…"
      : pending.length
        ? `${pending.length} ${pending.length === 1 ? "registro pendente" : "registros pendentes"}`
        : sync.updated
          ? `Sincronizado ${clock(sync.updated)}`
          : "";
  const syncState = !sync.online ? "offline" : pending.length ? "pending" : "ok";
  return (
    <div className="app">
      {menu && <button className="nav-scrim" onClick={() => setMenu(false)} aria-label="Fechar menu" />}
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <button className="brand" onClick={() => go(HOME)}>
          <span className="brand-icon" aria-hidden>
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
              <Icon size={19} aria-hidden />
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
            <Activity size={20} aria-hidden /> {name}
          </span>
          {data && <span className="pill">{phase}</span>}
        </header>
        <main>
          <div className="page-heading">
            <div>
              <h1>{page === HOME ? longDate(today()) : page}</h1>
              {page === HOME && data && (event || goal) && (
                <p className="today-status">
                  {event && (
                    <span>
                      <strong>{days(event.eventDate, today())} dias</strong> até {event.name}
                    </span>
                  )}
                  {goal && <span>{goal.title}</span>}
                </p>
              )}
            </div>
            {data && syncLabel && (
              <button
                type="button"
                className={`sync-status ${syncState}`}
                onClick={() => void refresh()}
                disabled={sync.syncing}
                aria-label={`${syncLabel}. Sincronizar agora`}
                title="Sincronizar agora"
              >
                {syncState === "offline" ? (
                  <CloudOff size={15} aria-hidden />
                ) : (
                  <RefreshCw size={15} aria-hidden className={sync.syncing ? "spin" : ""} />
                )}
                {syncLabel}
              </button>
            )}
          </div>
          {data && conflicts.length > 0 && (
            <section className="card conflict" role="alert">
              <h2>{conflicts.length === 1 ? "Um registro precisa de revisão" : `${conflicts.length} registros precisam de revisão`}</h2>
              <p>
                Eles estão salvos neste aparelho, mas o servidor não aceitou. Os outros registros continuam sincronizando
                normalmente.
              </p>
              {conflicts.map((p) => (
                <div key={p.mutationId} className="conflict-row">
                  <p>
                    <strong>
                      {TABLE_LABELS[p.table] ?? "Registro"} de {p.data.date.split("-").reverse().join("/")}
                    </strong>
                    : {p.error}
                  </p>
                  <details>
                    <summary>Ver o que está no aparelho</summary>
                    <pre>{JSON.stringify(p.data, null, 2)}</pre>
                  </details>
                  <button
                    className="button"
                    onClick={async () => {
                      if (
                        await ask(
                          "Descartar a alteração deste aparelho?",
                          "Descartar",
                          "A versão do servidor passa a valer. Copie os dados acima antes, se quiser registrá-los de novo.",
                        )
                      ) {
                        await discardPending(p.mutationId);
                        await refresh();
                      }
                    }}
                  >
                    Usar a versão do servidor
                  </button>
                </div>
              ))}
            </section>
          )}
          {error ? (
            <div className="card load-failure" role="alert">
              <h2>{FAILURES[error].title}</h2>
              <p>{FAILURES[error].body}</p>
              <div className="actions">
                {error === "auth" && (
                  <a className="button primary" href="/signin-with-chatgpt?return_to=/" target="_top">
                    Entrar
                  </a>
                )}
                <button className="button" onClick={retry} disabled={retrying}>
                  {retrying ? "Tentando…" : "Tentar novamente"}
                </button>
              </div>
            </div>
          ) : !data ? (
            <div className="loading" role="status" aria-label="Carregando seus registros">
              <div className="skeleton tall" />
              <div className="skeleton-row">
                <div className="skeleton" />
                <div className="skeleton" />
              </div>
              <div className="skeleton" />
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
              importRows={importRows}
              pending={pending.length}
            />
          )}
        </main>
      </div>
      <nav className="dock" aria-label="Atalhos">
        <button onClick={() => go(HOME)} aria-current={page === HOME ? "page" : undefined}>
          <Home size={21} aria-hidden />
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
            <Icon size={21} aria-hidden />
            {label}
          </button>
        ))}
        <button onClick={() => setMenu(true)} aria-expanded={menu}>
          <Menu size={21} aria-hidden />
          Menu
        </button>
      </nav>
      <Dialog
        open={!!modal}
        onOpenChange={(v) => {
          if (!v && !busy) setModal("");
        }}
      >
        <DialogContent
          className="body-dialog"
          // Radix would focus the first field (the date), which on a phone can
          // open a picker. Forms that want a field focused use autoFocus, which
          // runs first; otherwise the panel itself takes focus.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).focus();
          }}
        >
          <DialogTitle>{formTitle(modal, !!initial?.id)}</DialogTitle>
          <DialogDescription>
            {sync.online
              ? "Fica salvo neste aparelho e sincroniza em seguida."
              : "Você está offline: fica salvo neste aparelho e sincroniza quando a conexão voltar."}
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
            <button className="button" onClick={() => reply(false)} autoFocus>
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
          <button className="icon-button" onClick={() => setNotice("")} aria-label="Fechar aviso">
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
