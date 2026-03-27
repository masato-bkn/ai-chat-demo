import express from "express";
import cors from "cors";
import { query } from "@anthropic-ai/claude-agent-sdk";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/chat", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const theme = (req.query.theme as string) || "友達に本音が言えない";
  const turns = Math.min(parseInt(req.query.turns as string) || 6, 50);
  const agents = JSON.parse((req.query.agents as string) || "[]") as {
    name: string;
    description: string;
  }[];

  sendEvent({ type: "start", theme });

  try {
    let currentMessage = `「${theme}」について、あなたの考えや経験を聞かせてください。`;

    for (let turn = 0; turn < turns; turn++) {
      const agent = agents[turn % agents.length];

      for await (const message of query({
        prompt: currentMessage,
        options: {
          systemPrompt: `あなたは${agent.name}です。
${agent.description}
「${theme}」というテーマで会話しています。
2〜3文で返してください。余計な説明は不要です。`,
        },
      })) {
        if ("result" in message) {
          sendEvent({
            type: "message",
            speaker: `agent${turn % agents.length}`,
            name: agent.name,
            text: message.result,
          });
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
