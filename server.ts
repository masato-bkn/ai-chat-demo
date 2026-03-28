import express from "express";
import cors from "cors";
import { query } from "@anthropic-ai/claude-agent-sdk";

const app = express();
app.use(cors());
app.use(express.json());

/**
 * GET /chat
 * AI同士の会話をSSE（Server-Sent Events）でリアルタイム配信するエンドポイント
 *
 * クエリパラメータ:
 *   - theme: 会話のテーマ
 *   - turns: 総発言数（最大50）
 *   - agents: エージェント設定のJSON配列 [{ name, description }, ...]
 *
 * SSEイベント形式:
 *   - { type: "start", theme }         会話開始
 *   - { type: "message", speaker, name, text }  各エージェントの発言
 *   - { type: "done" }                 会話終了
 *   - { type: "error", message }       エラー発生時
 */
app.get("/chat", async (req, res) => {
  // SSEに必要なヘッダー設定
  // キャッシュを無効化してリアルタイム配信を実現する
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // SSEイベントを送信するヘルパー関数
  // SSEの仕様に従い "data: ...\n\n" 形式で送信する
  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // クエリパラメータの取得とデフォルト値の設定
  const theme = (req.query.theme as string) || "友達に本音が言えない";
  // 上限50ターンに制限（コストと時間の観点から）
  const turns = Math.min(parseInt(req.query.turns as string) || 6, 50);
  const agents = JSON.parse((req.query.agents as string) || "[]") as {
    name: string;
    description: string;
  }[];

  sendEvent({ type: "start", theme });

  try {
    // 最初の発言を促すメッセージ
    let currentMessage = `「${theme}」について、あなたの考えや経験を聞かせてください。`;

    for (let turn = 0; turn < turns; turn++) {
      // ターン番号 % エージェント数 で交互に発言させる
      const agent = agents[turn % agents.length];

      // Claude Agent SDKのquery()を使って各エージェントの発言を生成
      // APIキー不要でClaude Codeの認証を利用する
      for await (const message of query({
        prompt: currentMessage,
        options: {
          // システムプロンプトでキャラクターの性格・口調を定義する
          systemPrompt: `あなたは${agent.name}です。
${agent.description}
「${theme}」というテーマで会話しています。
2〜3文で返してください。余計な説明は不要です。`,
        },
      })) {
        if ("result" in message) {
          // 1発言ごとにSSEで送信してリアルタイム表示を実現する
          sendEvent({
            type: "message",
            speaker: `agent${turn % agents.length}`, // CSSクラス名に使用
            name: agent.name,
            text: message.result,
          });
          // 次のエージェントへ渡すメッセージとして使用する
          currentMessage = message.result;
        }
      }
    }
  } catch (e) {
    sendEvent({ type: "error", message: String(e) });
  }

  sendEvent({ type: "done" });
  res.end();
});

app.listen(3001, () => {
  console.log("Server running at http://localhost:3001");
});
