# ランキングAPIが playerId を全公開している問題

- **作成日**: 2026-08-21
- **目的**: 外部からの点検で見つかった認証の欠陥（未修正）の内容と、直す方向の候補を残す。修正時にここを読むこと。
- **状態**: 案1（player_id の非公開化）を実装済み。デプロイ待ち。案2は未着手

> ⚠️ このリポジトリは Public。**デプロイして穴が塞がるまで、このファイルは push しないこと。**
> push した時点で、未修正の穴の再現手順を公開することになる。

## 何が起きているか

このゲームの認証は `playerId`（UUID）だけで成り立っている。
`localStorage.playerId` を持っていることが、そのまま「その人である」ことの証明になる
（[uuid-key-auth 方式](../CLAUDE.md)）。

ところが `GET /api/ranking` が、その playerId を全ユーザー分そのまま返している。

`worker/src/workers.js` の `getRanking()`:

```sql
SELECT b.player_id, b.nickname, b.best_score, b.updated_at, ...
FROM best_scores b ... LIMIT 1000
```

このエンドポイントは認証も Origin チェックも無く、誰でも叩ける。
**秘密であるべき鍵を、公開一覧に載せてしまっている。**

## 影響

playerId を拾えば、その人として次ができる。

| エンドポイント | 検証しているもの | できてしまうこと |
| --- | --- | --- |
| `POST /api/update-nickname` | Origin一致 + playerIdが1〜100文字 | 他人のニックネームを書き換える |
| `POST /api/submit` | 同上 | 他人のベストスコアを改ざんする |
| `POST /api/record` | 同上 | 他人のプレイ記録を捏造する |
| `POST /api/issue-code` | 同上 | 他人の復元コードを発行する |
| `POST /api/restore` | code のみ（24h有効・使い切り） | ここだけは別の秘密で守られている |

いずれも「playerId が実在するか」「その持ち主か」を確認していない。

補足として、`issueCode()` は `ON CONFLICT(player_id) DO UPDATE` で
既存の復元コードを上書きするため、他人の playerId で叩くと
**その人が今まさに使おうとしている復元コードを無効化できる**（軽い妨害）。

## CORS は防御になっていない

`ALLOW_ORIGIN = 'https://yto.github.io'` で Origin を絞ってあるが、
これはブラウザが自主的に守るルールでしかない。
curl やサーバ間リクエストは Origin ヘッダを自由に付けられるので素通りする。
**認証の代わりにはならない。**

## 対処

### 案1：player_id を公開しない（実装済み・2026-08-21）

ランキングのレスポンスから `player_id` を落とし、代わりに
`public_id = SHA-256(player_id)` の16進小文字を返すようにした。

- `worker/src/workers.js` の `getRanking()` で行ごとにハッシュ化（`sha256Hex()`）
- `index.html` は起動時とランキング取得時に自分の playerId のハッシュを
  `crypto.subtle.digest` で計算し（`refreshPublicId()`）、`isSelfRow()` で突き合わせる
- **DB 移行なし・ユーザー移行なし。** `localStorage.playerId` は変えていない
- playerId は UUIDv4（122 bit）なので、ハッシュからの逆算は現実的でない

`index.html` で `player_id` を使っていたのは次の4箇所。全部 `isSelfRow()` に置き換えた。
消すだけだと、ランキングの「（自分）」表示・自分の順位・設定モーダルの
ベスト/更新日時/今週のプレイ回数・復元直後のベスト引き継ぎが壊れる。

ローカルの `wrangler dev` で、レスポンスに `player_id` が無く
`public_id` がフロントの計算値と一致することを確認済み。

### 案2：書き換え系に別の秘密を要求する（未着手）

restore と同じ仕組みの秘密トークンを playerId とは別に持たせ、
submit / record / update-nickname / issue-code で検証する。

**案1は「これ以上漏らさない」対策でしかない。** ランキングを一度でも取得した人の手元には、
その時点の全ユーザーの playerId が残っている。すでに配ってしまった分は取り消せないので、
本来は案2か playerId の再発行が要る。実際に収集されたかは不明。

隣に正解がある。同じ yto の `mymeshmap.pages.dev` は同じ UUID キー方式だが、
user_id を公開する画面が無いので成立している。
分かれ目は「鍵を一覧に載せたかどうか」だけ。

## 経緯

2026-08-21、別作業（VCN のセキュリティチェック記事づくり）で yto の3サイトを
外部から点検した際に発見。実際に curl で確認されたのは読み取り系のみで、
**書き込みの検証は他人のデータを触らないよう実行していない**。
上記の表は `worker/src/workers.js` を読んで確認した内容。

## 参照

- `worker/src/workers.js` — `getRanking()` / `issueCode()` / `updateNickname()` / `restorePlayer()`
- [SPEC.md](../SPEC.md)
