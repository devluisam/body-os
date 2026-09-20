import { schemas, today, foodMacros, macros, navyBF } from "./body.ts";
import type { Data, Row, Table } from "./body.ts";

export type Pending = {
  table: Table;
  data: Row;
  mutationId: string;
  baseVersion: string | null;
  error?: string;
};
type Cache = { owner: string; data: Data; pending: Pending[]; updated: string };
const DATABASE = "body-os-offline-v1";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DATABASE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("state");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(
        Error(
          "Armazenamento local indisponível. Libere espaço no dispositivo.",
        ),
      );
  });
}
async function storage<T>(key: string, value?: T): Promise<T | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      "state",
      value === undefined ? "readonly" : "readwrite",
    );
    const r =
      value === undefined
        ? tx.objectStore("state").get(key)
        : tx.objectStore("state").put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve(value === undefined ? r.result : value);
    };
    tx.onerror = () => {
      db.close();
      reject(
        Error(
          "Não foi possível salvar no dispositivo. Verifique o espaço disponível.",
        ),
      );
    };
    tx.onabort = tx.onerror;
  });
}
async function locked<T>(fn: () => Promise<T>): Promise<T> {
  if (!navigator.locks)
    throw Error(
      "Atualize seu navegador para usar sincronização segura entre abas.",
    );
  return await navigator.locks.request("body-os-sync", fn);
}
export function canonicalId(table: Table, data: Row) {
  return table === "settings"
    ? "profile-settings"
    : ["weight_logs", "daily_checkins", "nutrition_targets"].includes(table)
      ? `${table}-${data.date}`
      : data.id || crypto.randomUUID();
}
export function project(source: Data, queue: Pending[]): Data {
  const data = structuredClone(source);
  const put = (table: Table, row: Row) => {
    data[table] = [row, ...data[table].filter((x) => x.id !== row.id)];
  };
  for (const item of queue) {
    const row: Row = { ...item.data, _pending: true };
    if (item.table === "meals") {
      row.items = row.items.map((x: any, i: number) => {
        const food =
          data.foods.find((f) => f.id === x.foodId) ?? x.foodSnapshot;
        return {
          ...x,
          id: `${row.id}-item-${i}`,
          date: row.date,
          mealId: row.id,
          name: food?.name ?? "Alimento indisponível",
          ...foodMacros(
            food ?? {
              portion: 100,
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
            },
            x.grams,
          ),
        };
      });
      Object.assign(row, macros(row.items));
      data.meal_items = data.meal_items.filter((x) => x.mealId !== row.id);
      row.items.forEach((x: Row) => put("meal_items", x));
    }
    if (item.table === "daily_checkins")
      put("sleep_logs", {
        id: `sleep-${row.date}`,
        date: row.date,
        hours: row.hours,
        quality: row.quality,
        bedtime: row.bedtime,
        waketime: row.waketime,
      });
    if (item.table === "body_measurements") {
      const bf = navyBF(177, row.abdomen, row.neck);
      if (bf !== null)
        put("body_metrics", {
          id: `navy-${row.date}`,
          date: row.date,
          bf,
          method: "Circunferências (US Navy)",
          _pending: true,
        });
    }
    put(item.table, row);
  }
  return data;
}
export async function cached() {
  if (await storage<boolean>("locked")) return undefined;
  const owner = await storage<string>("owner");
  return owner ? storage<Cache>(owner) : undefined;
}
export async function enqueue(table: Table, input: Record<string, unknown>) {
  return locked(async () => {
    const cache = await cached();
    if (!cache)
      throw Error("Abra o aplicativo conectado antes de registrar offline.");
    const parsed = schemas[table]?.safeParse({ date: today(), ...input });
    if (!parsed?.success)
      throw Error("Revise os campos do registro antes de salvar.");
    const row = { ...parsed.data, createdAt: new Date().toISOString() } as Row;
    if (table !== "competition_events" && row.date > today())
      throw Error("Não registre medições no futuro.");
    if (table === "body_measurements" && row.abdomen <= row.neck)
      throw Error("Abdômen deve ser maior que pescoço.");
    row.id = canonicalId(table, row);
    if (table === "meals") {
      const available = project(cache.data, cache.pending).foods;
      row.items = row.items.map((x: any) => {
        const foodSnapshot = available.find((f) => f.id === x.foodId);
        if (!foodSnapshot)
          throw Error("Alimento não encontrado. Revise a refeição.");
        return { ...x, foodSnapshot };
      });
    }
    const previous = cache.pending.find(
      (p) => p.table === table && p.data.id === row.id,
    );
    const pending: Pending = {
      table,
      data: row,
      mutationId: crypto.randomUUID(),
      baseVersion: previous
        ? previous.baseVersion
        : (cache.data[table].find((r) => r.id === row.id)?.createdAt ?? null),
    };
    cache.pending = cache.pending.filter((p) => p !== previous);
    cache.pending.push(pending);
    project(cache.data, cache.pending);
    await storage(cache.owner, cache);
    return cache;
  });
}
export async function synchronize(): Promise<{
  cache: Cache;
  online: boolean;
}> {
  return locked(async () => {
    if (navigator.onLine === false) {
      const cache = await cached();
      if (cache) return { cache, online: false };
    }
    let response: Response;
    try {
      response = await fetch("/api/data", {
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
    } catch (error) {
      const cache = await cached();
      if (cache) return { cache, online: false };
      throw error;
    }
    if (
      response.status === 401 ||
      response.status === 403 ||
      response.redirected
    ) {
      await storage("locked", true);
      throw Error("Entre novamente para acessar e sincronizar seus registros.");
    }
    if (!response.ok) {
      const cache = await cached();
      if (cache) return { cache, online: false };
      throw Error("Servidor indisponível.");
    }
    const identity = response.headers.get("X-BodyOS-Owner");
    if (!identity)
      throw Error("Não foi possível confirmar a conta. Atualize o aplicativo.");
    const owner = decodeURIComponent(identity);
    const existing = await storage<Cache>(owner);
    const cache: Cache = {
      owner,
      data: await response.json(),
      pending: existing?.pending ?? [],
      updated: new Date().toISOString(),
    };
    await storage(owner, cache);
    await storage("owner", owner);
    await storage("locked", false);
    let online = true;
    for (const pending of [...cache.pending]) {
      if (pending.error) break;
      let result: Response;
      try {
        result = await fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...pending, expectedOwner: owner }),
          signal: AbortSignal.timeout(12000),
        });
      } catch {
        online = false;
        break;
      }
      if (!result.ok) {
        if (result.status === 401 || result.status === 403) {
          await storage("locked", true);
          throw Error(
            "Entre novamente na conta que criou os registros pendentes.",
          );
        }
        if (result.status >= 500) {
          online = false;
          break;
        }
        pending.error =
          ((await result.json().catch(() => ({}))) as { error?: string })
            .error ?? "Entre novamente antes de sincronizar.";
        await storage(owner, cache);
        break;
      }
      // Fetch the authoritative result before removing the operation; retries reuse its ID.
      try {
        const fresh = await fetch("/api/data", {
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        });
        if (!fresh.ok || fresh.headers.get("X-BodyOS-Owner") !== identity)
          break;
        cache.data = await fresh.json();
        cache.pending = cache.pending.filter(
          (p) => p.mutationId !== pending.mutationId,
        );
        await storage(owner, cache);
      } catch {
        online = false;
        break;
      }
    }
    return { cache, online };
  });
}
export async function discardPending(mutationId: string) {
  return locked(async () => {
    const cache = await cached();
    if (!cache) return;
    cache.pending = cache.pending.filter((p) => p.mutationId !== mutationId);
    await storage(cache.owner, cache);
  });
}
