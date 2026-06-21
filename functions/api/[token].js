// functions/api/note/[token].js
// GET  /api/note/:token  → load the note for this token
// POST /api/note/:token  → save the note for this token

export async function onRequestGet(context) {
  const { params, env } = context;
  const { token } = params;

  const data = await env.NOTE_KV.get(`token:${token}`, { type: 'json' });
  if (!data) {
    return Response.json({ error: 'Token not found' }, { status: 404 });
  }

  return Response.json({ text: data.text || '', updatedAt: data.updatedAt || null });
}

export async function onRequestPost(context) {
  const { request, params, env } = context;
  const { token } = params;

  const data = await env.NOTE_KV.get(`token:${token}`, { type: 'json' });
  if (!data) {
    return Response.json({ error: 'Token not found' }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text : '';
  if (text.length > 50000) {
    return Response.json({ error: 'Text too long (max 50,000 characters)' }, { status: 413 });
  }

  const updatedAt = new Date().toISOString();
  await env.NOTE_KV.put(`token:${token}`, JSON.stringify({ ...data, text, updatedAt }));

  return Response.json({ updatedAt });
}
