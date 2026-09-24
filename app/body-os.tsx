"use client";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  ChevronRight,
  Dumbbell,
  Heart,
  Home,
  Menu,
  Plus,
  Scale,
  Settings,
  Shield,
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
import { Data, Draft, Table, latest } from "@/lib/body";
import { RecordForm } from "./forms";
import {
  enqueue,
  synchronize,
  project,
  discardPending,
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
export default function BodyOS() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [page, setPage] = useState("Visão geral"),
    [menu, setMenu] = useState(false),
    [modal, setModal] = useState(""),
    [initial, setInitial] = useState<Draft | undefined>(),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState<Pending[]>([]),
    [online, setOnline] = useState(true);
  async function refresh() {
    try {
      const result = await synchronize();
      setData(project(result.cache.data, result.cache.pending));
      setPending(result.cache.pending);
      setOnline(result.online);
      setError("");
    } catch (e) {
      setData(null);
      setError(String(e));
    }
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
    const h = decodeURIComponent(location.hash.slice(1));
    if (navigation.some(([n]) => n === h)) setPage(h);
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
    setPage(n);
    setMenu(false);
    location.hash = n;
    window.scrollTo({ top: 0 });
  }
  function open(n: string, row?: Draft) {
    setInitial(row);
    setModal(n);
  }
  async function save(table: Table, payload: Record<string, unknown>) {
    if (busy) return false;
    setBusy(true);
    try {
      const cache = await enqueue(table, payload);
      setData(project(cache.data, cache.pending));
      setPending(cache.pending);
      setModal("");
      setNotice("Registro salvo no dispositivo. Sincronização pendente.");
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
    if (!confirm("Excluir este registro?")) return;
    try {
      const r = await fetch("/api/data", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table, id }),
        }),
        j = (await r.json()) as any;
      if (!r.ok) throw Error(j.error);
      await refresh();
      setNotice("Registro excluído.");
    } catch (e) {
      setNotice(String(e));
    }
  }
  const name = latest(data?.settings ?? [])?.name ?? "BODY OS",
    views: Record<string, any> = {
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
        <a className="brand" href="/">
          <span className="brand-icon">
            <Activity size={25} />
          </span>
          {name}
          <span className="version">01</span>
        </a>
        <div className="workspace">
          <span className="avatar">A</span>
          <div>
            Meu espaço <small>Atleta · Jiu-Jitsu</small>
          </div>
          <ChevronRight size={16} />
        </div>
        <span className="nav-label">SEU SISTEMA</span>
        <nav>
          {navigation.map(([n, Icon]) => (
            <button
              key={n}
              onClick={() => go(n)}
              className={page === n ? "active" : ""}
              aria-current={page === n ? "page" : undefined}
            >
              <Icon size={19} />
              {n}
              {n === "Assistente" && <span className="mini">OS</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Shield size={18} />
          <p>
            Construído para o longo prazo.
            <small>Composição + performance.</small>
          </p>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <button
            className="mobile-only icon-button"
            aria-label="Abrir menu"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Meu espaço <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="header-right">
            <span className="private-label">
              <Shield size={14} /> Espaço pessoal
            </span>
            <span className="avatar small">A</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                COMPOSIÇÃO. PERFORMANCE. CONSISTÊNCIA.
              </div>
              <h1>
                {page === "Visão geral"
                  ? "Sua melhor versão, todos os dias."
                  : page}
              </h1>
              <p>
                {page === "Visão geral"
                  ? "Cada registro conta. O progresso vai além da balança."
                  : "Seu histórico transforma dados em decisões melhores."}
              </p>
            </div>
            <button className="button primary" onClick={() => open("Peso")}>
              <Plus size={18} /> Registrar peso
            </button>
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
                      {p.data.date} · {p.table}: {p.error}
                    </p>
                    <details>
                      <summary>Ver registro local</summary>
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
                          confirm(
                            "Descartar esta alteração local e usar o registro do servidor?",
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
            <div className="card error">
              <p>Não foi possível carregar seus dados. {error}</p>
              <button className="button" onClick={refresh}>
                Tentar novamente
              </button>
              <a
                className="button"
                href="/signin-with-chatgpt?return_to=/"
                target="_top"
              >
                Entrar
              </a>
            </div>
          ) : !data ? (
            <div className="card" role="status">
              Carregando seu espaço…
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
            />
          )}
        </main>
        <footer>
          {name}
          <span>Seu corpo. Seu ritmo. Sua evolução.</span>
        </footer>
      </div>
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
            Atualize seus dados para acompanhar composição e performance.
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
