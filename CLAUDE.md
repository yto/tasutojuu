# CLAUDE.md

## プロジェクト概要

「タスジュウ」は8×8の数字盤面で隣接ペアの合計10を探す30秒タイムアタックパズルゲーム。
詳細仕様は [SPEC.md](./SPEC.md) を参照。

- フロントエンド: `index.html`（単一ファイル、GitHub Pages）
- バックエンド: `worker/src/workers.js`（Cloudflare Workers）
- DB: Cloudflare D1（バインディング名: `DB`、DB名: `puzzle-ranking`）

## ファイル構成

```
index.html          # ゲーム本体（HTML/CSS/JS すべて1ファイル）
sw.js               # Service Worker（PWA用）
manifest.json       # Web App Manifest
worker/
  src/workers.js    # Cloudflare Worker（APIサーバ）
  schema.sql        # D1テーブル定義
  wrangler.toml     # Wrangler設定
```

## 開発・デプロイ

### フロントエンド

ビルド不要。`index.html` を直接編集する。`main` ブランチへの push で GitHub Pages に自動デプロイされる。

ローカル確認:
```sh
npx serve .
# または
python3 -m http.server 8080
```

### Worker

```sh
cd worker
npx wrangler dev          # ローカル開発（D1はローカルDBを使用）
npx wrangler deploy       # 本番デプロイ（CIでも自動実行）
```

`worker/**` の変更を `main` へ push すると GitHub Actions が自動デプロイする。

### D1 マイグレーション

```sh
cd worker
# ローカル
npx wrangler d1 execute puzzle-ranking --local --file=schema.sql
# 本番
npx wrangler d1 execute puzzle-ranking --file=schema.sql
```

## コーディングルール

- フロントエンドはバニラJS。フレームワーク・バンドラー不使用
- `index.html` の `<script>` 内に全ロジックを記述する
- Worker はモジュール構文（`export default`）、依存パッケージなし
- CORS許可オリジン: `https://yto.github.io`（`ALLOW_ORIGIN` 定数）
- ニックネーム上限: 10文字
- スコアは非負整数のみ受け付ける

## 注意事項

- `localStorage.playerId` はプレイヤーの識別子。変更しないこと
- パーティーモードのシード `'tasujuu-party-v1:' + bucket` を変えると既存の同時プレイが壊れる
- ランキングAPIはOriginヘッダーを検証しているため、直接 `fetch` する場合は Origin を付けること
