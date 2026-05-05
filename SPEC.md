# タスジュウ 仕様書

## 概要

「タスジュウ」は8×8の数字盤面で、隣接する2マスの合計が10になるペアを30秒間でできるだけ多く見つけるタイムアタックパズルゲームです。PWAとして動作し、グローバルランキングに対応しています。

- フロントエンド: `https://yto.github.io/tasutojuu/`
- API: `https://autumn-hall-9233.tatsuo-8d3.workers.dev`

---

## 構成

| レイヤー | 技術 |
|---|---|
| フロントエンド | 静的 HTML/CSS/JS（GitHub Pages） |
| バックエンド | Cloudflare Workers |
| データベース | Cloudflare D1（SQLite） |
| PWA | Service Worker + Web App Manifest |

---

## ゲームルール

- 盤面: 8×8 = 64マス、各マスに1〜9の乱数を配置
- ゲーム時間: 30秒
- 操作: タップ（クリック）で1マス目を選択 → 隣接マス（上下左右）をタップ
  - 合計が10: 成功。スコア +1、2マスに新しい乱数が入る
  - 合計が10でない: 失敗。後からタップしたマスに選択が移る
  - 同じマスを再タップ: 選択解除
  - 隣接していないマスをタップ: 選択が移る
- 残り5秒以下: タイマーとプログレスバーが赤くなる（警告表示）
- マッチ時: バイブレーション 40ms。失敗時: 30-40-30ms パターン
- ゲーム終了後: ヒント表示（合計10になる隣接ペアをピンク色で強調）

---

## プレイヤー識別

- `playerId`: `crypto.randomUUID()` で生成し `localStorage.playerId` に保存
- 自己ベスト: `localStorage.tasujuuBestScore`
- ユーザ名: `localStorage.nickname`（最大10文字）

---

## ゲームモード

### ノーマルモード

- `Math.random()` で盤面を生成
- タイムアップ時、スコアがランキング登録対象
- 自己ベスト以上のスコアのみ `/api/submit` でランキングに保存できる
- プレイ回数カウントのため `/api/record` を毎回（タイムアップ時）呼ぶ

### みんなで同時プレイ（パーティーモード）

- 毎分0秒と30秒（30秒バケット）を基準に全員が同じ盤面でプレイ
- シード: `'tasujuu-party-v1:' + bucket`（bucket = `Math.floor(Date.now() / 30000)`）
- 同じシードで FNV-1a ベースの疑似乱数を生成し、盤面を共有
- 「次の同時プレイまでのカウントダウン」を表示後、自動スタート（3秒カウントダウンなし）
- ランキング・プレイ回数カウントには反映されない

---

## 画面構成

### メイン画面

- 上部バー: プログレスバー（残り時間）、スコア / 残り時間 / 自己ベスト
- 盤面: 8×8グリッド
- メッセージ行: 操作フィードバック
- モードバッジ: パーティーモード中に表示
- 下部バー: スタート/棄権ボタン、サブアクション4ボタン

### サブアクションボタン

| ボタン | 機能 |
|---|---|
| 🏆 | ランキングモーダル |
| 👤 | マイページモーダル |
| 👥 | みんなで同時プレイモーダル |
| ℹ️ | ヘルプモーダル |

### モーダル一覧

| モーダル | 主な内容 |
|---|---|
| 結果 | スコア、ユーザ名入力、ランキング保存ボタン |
| ランキング | TOP 100 表示、自分の順位表示 |
| マイページ | ユーザ名・ベスト・最終更新・週間プレイ回数、ユーザ名変更、ログインコード発行/入力 |
| みんなで同時プレイ | 次の開始まで秒数、参加ボタン、URL/QRコード共有 |
| ヘルプ | 遊び方説明、任意支援リンク、GitHubリンク |

---

## ログインコード（デバイス引き継ぎ）

1. マイページ→「ログインコード発行」→ `/api/issue-code` が `XXXX-XXXX` 形式の8文字コードを返す
2. 24時間有効、1回のみ使用可
3. 新端末でコードを入力→「ログインする」（確認ステップあり）→ `/api/restore` で `playerId` を取得
4. localStorage を上書きし、ランキングからニックネームとベストを復元

---

## API

ベースURL: `https://autumn-hall-9233.tatsuo-8d3.workers.dev`

CORS許可オリジン: `https://yto.github.io`（Origin ヘッダー検証）

### GET /api/ranking

ランキング上位1000件を取得。

**レスポンス**
```json
{
  "ok": true,
  "ranking": [
    {
      "player_id": "...",
      "nickname": "TATSUO",
      "best_score": 42,
      "updated_at": "2026-01-01 12:00:00",
      "weekly_count": 10
    }
  ]
}
```

### POST /api/submit

自己ベスト更新時にスコアとユーザ名を登録。同一 `player_id` は `best_score` を MAX で更新。

**リクエスト**
```json
{ "playerId": "uuid", "nickname": "TATSUO", "score": 42 }
```

**バリデーション**
- `playerId`: 必須、100文字以内
- `nickname`: 1〜10文字
- `score`: 0以上の整数

### POST /api/record

プレイ1回を記録（週間プレイ回数集計用）。タイムアップ時のみ呼ぶ。

**リクエスト**
```json
{ "playerId": "uuid", "score": 42 }
```

### POST /api/issue-code

デバイス引き継ぎコードを発行。同一 `player_id` は上書き。

**リクエスト**
```json
{ "playerId": "uuid" }
```

**レスポンス**
```json
{ "ok": true, "code": "ABCD-EFGH" }
```

コード文字セット: `ABCDEFGHJKMNPQRSTUVWXYZ23456789`（誤読しやすい文字を除外）

### POST /api/restore

引き継ぎコードでログイン。コードは使用後削除。

**リクエスト**
```json
{ "code": "ABCD-EFGH" }
```

**レスポンス**
```json
{ "ok": true, "playerId": "uuid" }
```

### POST /api/update-nickname

ランキング登録済みプレイヤーのユーザ名を変更。

**リクエスト**
```json
{ "playerId": "uuid", "nickname": "NEWNAME" }
```

---

## データベース（Cloudflare D1）

### scores

プレイ履歴。週間プレイ回数の集計に使用。

| カラム | 型 | 説明 |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| player_id | TEXT | |
| nickname | TEXT | |
| score | INTEGER | |
| created_at | TEXT | UTC datetime |

### best_scores

プレイヤーの自己ベスト。player_id がプライマリキー。

| カラム | 型 | 説明 |
|---|---|---|
| player_id | TEXT PK | |
| nickname | TEXT NOT NULL | |
| best_score | INTEGER NOT NULL | MAX で更新 |
| updated_at | TEXT NOT NULL | UTC datetime |

### restore_codes

デバイス引き継ぎコード。player_id がプライマリキー（1人1コード）。

| カラム | 型 | 説明 |
|---|---|---|
| player_id | TEXT PK | |
| code | TEXT NOT NULL UNIQUE | |
| created_at | TEXT NOT NULL | UTC datetime |

コードの有効期限: 発行から24時間（`created_at > datetime('now', '-24 hours')` で検証）

---

## フロントエンド実装メモ

- ボード: innerHTML を毎回再生成（イベントリスナーも再アタッチ）
- タイマー: `setInterval(updateTime, 50)` で 50ms ごとに更新
- パーティーウェイト: `setInterval(updatePartyWait, 100)` で監視、開始時刻になったら自動スタート
- 3秒カウントダウン: アニメーション付き（`countdown-pop` キーフレーム）
- 自己ベスト更新時: ✨⭐🌟💫 スパークアニメーション（24個、120ms 間隔）
- PWA: `sw.js` を Service Worker として登録

---

## デプロイ

| 対象 | 方法 |
|---|---|
| フロントエンド | GitHub Pages（`main` ブランチの `index.html` 等を自動公開） |
| Cloudflare Worker | GitHub Actions（`.github/workflows/deploy-worker.yml`） |
