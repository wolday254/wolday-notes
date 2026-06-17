// functions/api/note.js
// Cloudflare Pages Function — handles reading and publishing the shared note.
// Requires a KV namespace bound to this Pages project as "NOTE_KV".

const NOTE_KEY = "note";

export async function onRequestGet(context) {
  const { env } = context;
  const stored = await env.NOTE_KV.get(NOTE_KEY, { type: "json" });
  const text = stored?.text ?? "";
  const updatedAt = stored?.updatedAt ?? null;

  return Response.json({ text, updatedAt });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";

  // Basic size guard — adjust as needed (KV values can be up to 25MB,
  // but there's no reason to allow huge payloads for a simple note).
  if (text.length > 50000) {
    return new Response("Text too long (max 50,000 characters)", { status: 413 });
  }

  const record = { text, updatedAt: new Date().toISOString() };
  await env.NOTE_KV.put(NOTE_KEY, JSON.stringify(record));

  return Response.json(record);
}
