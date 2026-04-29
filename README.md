# タスジュウ (tasujuu)

足すと10になる数字ペアを消していく、タイムアタック型のパズルゲームです。

**公開URL:** https://yto.github.io/tasutojuu/

---

## ユーザ向け

### ゲーム概要

- 8×8マスに1〜9の数字がランダムに配置されます
- 隣接する2マスの合計が10になると消去されます
- 消えたマスには新しい数字が補充されます
- 制限時間30秒でスコア（成立したペア数）を競います

### 操作方法

- マスをタップすると選択状態になります
- もう一度タップすると選択が解除されます
- 選択中に上下左右の隣接マスをタップします
  - 合計が10の場合：成功（消去＋スコア加算）
  - 合計が10でない場合：選択が後に押したマスへ移動します

### ゲーム仕様

- 制限時間：30秒
- スコア：成立したペア数
- 残り5秒でタイマー表示が変化します
- ゲーム終了時に結果モーダルが表示されます

### スコアとランキング

- 自己ベスト以上のスコアのときのみランキングに反映されます
- ランキングボタンから上位100件および自分の順位をモーダルで確認可能

### スマホへのインストール（PWA）

ブラウザからホーム画面に追加すると、アプリのように起動できます。

**iPhone（Safari）**

1. Safari でページを開く
2. 画面下部の共有ボタン（四角に矢印のアイコン）をタップ
3. 「ホーム画面に追加」をタップ
4. 名前を確認して「追加」をタップ

**Android（Chrome）**

1. Chrome でページを開く
2. アドレスバーのインストールアイコン、または右上「⋮」メニューから「ホーム画面に追加」をタップ
3. 名前を確認して「追加」をタップ

### アカウントについて

- ユーザ登録やログインは不要です
- ユーザ名はゲーム終了後またはユーザ設定から変更できます

### ログインコード

端末変更・ブラウザ変更・複数端末での利用時にアカウントを引き継げます。

1. 旧端末のユーザ設定から「ログインコード発行」をタップ
2. 表示された8桁のコードをコピーして控えます
3. 新端末で「ログインコード入力」欄にコードを入力してログイン
   - コードは24時間以内に1回だけ使用可能

---

## 技術者向け

### 開発について

このゲームは ChatGPT と Claude Code との対話を通じて開発しました。

Claude Code との対話ログ（セッションログ）を公開しています（途中から＆途中まで）：[session-log.md](session-log.md)

### クライアント側の状態管理

- playerId（UUID）を自動生成して localStorage に保存し、ユーザを識別
- 自己ベストスコアも localStorage にキャッシュ（サーバーの best_scores テーブルと二重管理）

### フロントエンド

- 単一ファイル構成（index.html）
- HTML / CSS / JavaScript（フレームワーク不使用）
- PWA 対応（Service Worker・Web App Manifest・PNG アイコン 180px / 512px・maskable 対応）
- GitHub Pages でホスティング
- モバイルファースト・フルスクリーンレイアウト・safe-area 対応
- スマホ体験向上：バウンス防止・長押し抑制・タップ振動フィードバック（Android）

### バックエンド

- Cloudflare Workers（API サーバー）
- Cloudflare D1（SQLite ベースの DB）

### API エンドポイント

| メソッド | パス | 概要 |
|---|---|---|
| GET | /api/ranking | ランキング取得 |
| POST | /api/submit | スコア登録 |
| POST | /api/update-nickname | ユーザ名変更 |
| POST | /api/issue-code | ログインコード発行 |
| POST | /api/restore | ログインコードによるアカウント復元 |

### データ設計

```sql
-- 全スコア履歴
CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT,
  nickname TEXT,
  score INTEGER,
  created_at TEXT
);

-- 自己ベスト（ランキング用）
CREATE TABLE best_scores (
  player_id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  best_score INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

-- ログインコード（24時間・1回限り）
CREATE TABLE restore_codes (
  player_id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
```

---

## ライセンス

MIT License
