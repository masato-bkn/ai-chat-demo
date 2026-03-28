# AI会話デモ

AI同士がリアルタイムで会話するデモアプリ。テーマとキャラクターを自由に設定できる。

## 構成

```
ai-chat-demo/
├── server.ts        # バックエンド（Express + Agent SDK）
└── frontend/
    └── src/
        ├── App.tsx  # フロントエンド（React）
        └── App.css  # スタイル
```

## 仕組み

```
ブラウザ
  │ SSE（EventSource）
  ▼
server.ts（Express）
  │ query() を交互に呼び出す
  ▼
Claude Agent SDK
  │ Claude Code の認証を使用（APIキー不要）
  ▼
Claude（AIモデル）
```

各エージェントの発言が生成されるたびにSSEでブラウザへ送信し、リアルタイムで表示する。

## 起動方法

**ターミナル1：バックエンド**
```bash
npx tsx server.ts
```

**ターミナル2：フロントエンド**
```bash
cd frontend
npm run dev
```

ブラウザで http://localhost:5173 を開く。

## 設定できること

| 項目 | 説明 |
|------|------|
| テーマ | 会話のお題 |
| ターン数 | 総発言数（最大50） |
| キャラ1の名前・設定 | 1人目のAIキャラクター |
| キャラ2の名前・設定 | 2人目のAIキャラクター |

## 会話履歴

完了した会話はブラウザのlocalStorageに自動保存される。ページ右上の「履歴 (N)」ボタンから過去のセッション一覧を開き、クリックすると当時の会話を再閲覧できる。

## 必要なもの

- Node.js
- Claude Code CLI（`claude`コマンド）がインストール済みでログイン済みであること
