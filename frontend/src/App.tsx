import { useState } from "react";
import "./App.css";

type Message = {
  speaker: "agent0" | "agent1";
  name: string;
  text: string;
};

type AgentConfig = {
  name: string;
  description: string;
};

const DEFAULTS = {
  theme: "友達に本音が言えない",
  agents: [
    { name: "武蔵", description: "江戸時代の侍。古風な口調（〜でござる）で話す。" },
    { name: "みか", description: "現代のギャル。ギャル語全開（マジで、じゃん、エモい）で話す。" },
  ] as AgentConfig[],
};

export default function App() {
  const [theme, setTheme] = useState(DEFAULTS.theme);
  const [agents, setAgents] = useState<AgentConfig[]>(DEFAULTS.agents);
  const [turns, setTurns] = useState(6);
  const [messages, setMessages] = useState<Message[]>([]);
  const [running, setRunning] = useState(false);
  const [activeTheme, setActiveTheme] = useState("");
  const [done, setDone] = useState(false);

  const updateAgent = (idx: number, field: keyof AgentConfig, value: string) => {
    setAgents((prev) => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  const startChat = () => {
    setMessages([]);
    setDone(false);
    setRunning(true);
    setActiveTheme(theme);

    const params = new URLSearchParams({
      theme,
      turns: String(turns),
      agents: JSON.stringify(agents),
    });
    const es = new EventSource(`http://localhost:3001/chat?${params}`);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "message") {
        setMessages((prev) => [...prev, data as Message]);
      } else if (data.type === "done") {
        setRunning(false);
        setDone(true);
        es.close();
      } else if (data.type === "error") {
        console.error(data.message);
        setRunning(false);
        es.close();
      }
    };
  };

  return (
    <div className="container">
      <h1>🤖 AI会話デモ</h1>

      <div className="settings">
        <div className="field">
          <label>テーマ</label>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            disabled={running}
            placeholder="例：仕事のストレスをどう発散する？"
          />
        </div>

        <div className="field">
          <label>ターン数（最大50）</label>
          <input
            type="number"
            min={2}
            max={50}
            value={turns}
            onChange={(e) => setTurns(Number(e.target.value))}
            disabled={running}
          />
        </div>

        {agents.map((agent, i) => (
          <div key={i} className="agent-config">
            <div className="field">
              <label>キャラ{i + 1}の名前</label>
              <input
                value={agent.name}
                onChange={(e) => updateAgent(i, "name", e.target.value)}
                disabled={running}
                placeholder="名前"
              />
            </div>
            <div className="field">
              <label>キャラ{i + 1}の設定</label>
              <textarea
                value={agent.description}
                onChange={(e) => updateAgent(i, "description", e.target.value)}
                disabled={running}
                placeholder="どんなキャラか説明してください"
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>

      <button onClick={startChat} disabled={running} className="start-btn">
        {running ? "会話中..." : "会話スタート"}
      </button>

      {activeTheme && <p className="theme">テーマ：「{activeTheme}」</p>}

      <div className="chat-area">
        {messages.map((msg, i) => (
          <div key={i} className={`bubble ${msg.speaker}`}>
            <span className="name">{msg.name}</span>
            <p>{msg.text}</p>
          </div>
        ))}
        {running && <div className="typing">考え中...</div>}
        {done && <div className="done">— 会話終了 —</div>}
      </div>
    </div>
  );
}
