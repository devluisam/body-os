import { env } from "cloudflare:workers";
import { owner, guard, db, put, failure } from "@/lib/server";
import { today } from "@/lib/body";
export async function POST(req: Request) {
  try {
    guard(req);
    const user = owner(req);
    if (!env.BUCKET) throw Error("Armazenamento indisponível");
    if (Number(req.headers.get("content-length")) > 9_000_000)
      throw Error("Limite de 8 MB por foto");
    const form = await req.formData(),
      file = form.get("file"),
      date = String(form.get("date")),
      view = String(form.get("view"));
    if (!(file instanceof File) || file.size > 8_000_000)
      throw Error("Escolha uma foto de até 8 MB");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw Error("Use JPG, PNG ou WebP. No iPhone, exporte HEIC como JPG.");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      date > today() ||
      isNaN(Date.parse(date))
    )
      throw Error("Data inválida");
    if (
      !["Frente", "Costas", "Perfil esquerdo", "Perfil direito"].includes(view)
    )
      throw Error("Posição inválida");
    const bytes = await file.arrayBuffer(),
      b = new Uint8Array(bytes);
    const valid =
      (file.type === "image/jpeg" && b[0] === 255 && b[1] === 216) ||
      (file.type === "image/png" && b[0] === 137 && b[1] === 80) ||
      (file.type === "image/webp" &&
        String.fromCharCode(...b.slice(8, 12)) === "WEBP");
    if (!valid) throw Error("Arquivo de imagem inválido");
    const id = crypto.randomUUID(),
      key = `${user}/${id}`;
    await env.BUCKET.put(key, bytes, {
      httpMetadata: { contentType: file.type },
    });
    try {
      await put("progress_photos", user, {
        id,
        date,
        view,
        key,
        type: file.type,
      }).run();
    } catch (e) {
      await env.BUCKET.delete(key);
      throw e;
    }
    return Response.json({ ok: true, id });
  } catch (e) {
    return failure(e);
  }
}
export async function GET(req: Request) {
  try {
    const user = owner(req),
      id = new URL(req.url).searchParams.get("id");
    const r: any = await db()
      .prepare("SELECT payload FROM progress_photos WHERE id=? AND user_id=?")
      .bind(id, user)
      .first();
    if (!r || !env.BUCKET)
      return new Response("Não encontrada", { status: 404 });
    const obj = await env.BUCKET.get(JSON.parse(r.payload).key);
    if (!obj) return new Response("Não encontrada", { status: 404 });
    return new Response(obj.body, {
      headers: {
        "Content-Type": JSON.parse(r.payload).type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request) {
  try {
    guard(req);
    const user = owner(req),
      { id } = (await req.json()) as any;
    const r: any = await db()
      .prepare("SELECT payload FROM progress_photos WHERE id=? AND user_id=?")
      .bind(id, user)
      .first();
    if (r) {
      await env.BUCKET?.delete(JSON.parse(r.payload).key);
      await db()
        .prepare("DELETE FROM progress_photos WHERE id=? AND user_id=?")
        .bind(id, user)
        .run();
    }
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
