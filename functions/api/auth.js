// functions/api/auth.js
// Handles signup and login. Stores users in NOTE_KV.

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'wolday-notes-salt-2026');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { action, username, password } = body;

  if (!username || !password) {
    return Response.json({ error: 'Username and password required' }, { status: 400 });
  }

  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (cleanUsername.length < 3) {
    return Response.json({ error: 'Username must be at least 3 characters (letters, numbers, hyphens, underscores only)' }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const userKey = `user:${cleanUsername}`;

  if (action === 'signup') {
    const existing = await env.NOTE_KV.get(userKey);
    if (existing) {
      return Response.json({ error: 'That username is already taken' }, { status: 409 });
    }

    const token = generateToken();
    await env.NOTE_KV.put(userKey, JSON.stringify({ passwordHash, token }));
    await env.NOTE_KV.put(`token:${token}`, JSON.stringify({
      username: cleanUsername,
      text: '',
      updatedAt: null
    }));

    return Response.json({ token, username: cleanUsername });

  } else if (action === 'login') {
    const stored = await env.NOTE_KV.get(userKey, { type: 'json' });
    if (!stored || stored.passwordHash !== passwordHash) {
      return Response.json({ error: 'Incorrect username or password' }, { status: 401 });
    }

    return Response.json({ token: stored.token, username: cleanUsername });

  } else {
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  }
}
