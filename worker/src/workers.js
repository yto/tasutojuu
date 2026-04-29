const ALLOW_ORIGIN = 'https://yto.github.io';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (url.pathname === '/api/submit' && request.method === 'POST') {
      return submitScore(request, env);
    }

    if (url.pathname === '/api/ranking' && request.method === 'GET') {
      return getRanking(env);
    }

    if (url.pathname === '/api/issue-code' && request.method === 'POST') {
      return issueCode(request, env);
    }

    if (url.pathname === '/api/restore' && request.method === 'POST') {
      return restorePlayer(request, env);
    }

    if (url.pathname === '/api/update-nickname' && request.method === 'POST') {
      return updateNickname(request, env);
    }

    return json({ ok: false, error: 'Not Found' }, 404);
  },
};

async function submitScore(request, env) {
  const origin = request.headers.get('Origin');
  if (origin !== ALLOW_ORIGIN) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'JSONが不正です' }, 400);
  }

  const playerId = String(body.playerId || '').trim();
  const nickname = String(body.nickname || '').trim();
  const score = Number(body.score);

  if (!playerId || playerId.length > 100) {
    return json({ ok: false, error: 'playerIdが不正です' }, 400);
  }

  if (!nickname || nickname.length > 10) {
    return json({ ok: false, error: 'ユーザ名は1〜10文字で入力してください' }, 400);
  }

  if (!Number.isInteger(score) || score < 0 || score > 999999999) {
    return json({ ok: false, error: 'スコアは0以上の整数で入力してください' }, 400);
  }

  await env.DB.prepare(
    `INSERT INTO scores (player_id, nickname, score, created_at)
     VALUES (?, ?, ?, datetime('now'))`
  )
    .bind(playerId, nickname, score)
    .run();

  await env.DB.prepare(
    `INSERT INTO best_scores (player_id, nickname, best_score, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(player_id) DO UPDATE SET
       nickname = excluded.nickname,
       best_score = MAX(best_scores.best_score, excluded.best_score),
       updated_at = datetime('now')`
  )
    .bind(playerId, nickname, score)
    .run();

  return json({ ok: true });
}

async function getRanking(env) {
  const result = await env.DB.prepare(
    `SELECT player_id, nickname, best_score, updated_at
     FROM best_scores
     ORDER BY best_score DESC, updated_at DESC
     LIMIT 1000`
  ).all();

  return json({ ok: true, ranking: result.results || [] });
}

async function issueCode(request, env) {
  const origin = request.headers.get('Origin');
  if (origin !== ALLOW_ORIGIN) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'JSONが不正です' }, 400);
  }

  const playerId = String(body.playerId || '').trim();
  if (!playerId || playerId.length > 100) {
    return json({ ok: false, error: 'playerIdが不正です' }, 400);
  }

  const code = generateCode();

  await env.DB.prepare(
    `INSERT INTO restore_codes (player_id, code, created_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(player_id) DO UPDATE SET
       code = excluded.code,
       created_at = excluded.created_at`
  )
    .bind(playerId, code)
    .run();

  return json({ ok: true, code });
}

async function restorePlayer(request, env) {
  const origin = request.headers.get('Origin');
  if (origin !== ALLOW_ORIGIN) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'JSONが不正です' }, 400);
  }

  const code = String(body.code || '').trim().toUpperCase();
  if (!code) {
    return json({ ok: false, error: 'コードが不正です' }, 400);
  }

  const row = await env.DB.prepare(
    `SELECT player_id FROM restore_codes
     WHERE code = ? AND created_at > datetime('now', '-24 hours')`
  )
    .bind(code)
    .first();

  if (!row) {
    return json({ ok: false, error: 'コードが無効または期限切れです' }, 404);
  }

  await env.DB.prepare(`DELETE FROM restore_codes WHERE code = ?`)
    .bind(code)
    .run();

  return json({ ok: true, playerId: row.player_id });
}

async function updateNickname(request, env) {
  const origin = request.headers.get('Origin');
  if (origin !== ALLOW_ORIGIN) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'JSONが不正です' }, 400);
  }

  const playerId = String(body.playerId || '').trim();
  const nickname = String(body.nickname || '').trim();

  if (!playerId || playerId.length > 100) {
    return json({ ok: false, error: 'playerIdが不正です' }, 400);
  }

  if (!nickname || nickname.length > 10) {
    return json({ ok: false, error: 'ユーザ名は1〜10文字で入力してください' }, 400);
  }

  await env.DB.prepare(
    `UPDATE best_scores SET nickname = ? WHERE player_id = ?`
  )
    .bind(nickname, playerId)
    .run();

  return json({ ok: true });
}

function generateCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store',
      ...corsHeaders(),
    },
  });
}
