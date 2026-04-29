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
    `SELECT player_id, nickname, best_score
     FROM best_scores
     ORDER BY best_score DESC, updated_at DESC
     LIMIT 1000`
  ).all();

  return json({ ok: true, ranking: result.results || [] });
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
