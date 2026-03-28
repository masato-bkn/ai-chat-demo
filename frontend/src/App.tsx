import { useState, useEffect } from "react";
import "./App.css";

// 会話メッセージの型
// speaker はCSSクラス名として使用（agent0=左側、agent1=右側）
type Message = {
  speaker: "agent0" | "agent1";
  name: string;
  text: string;
};

// エージェント（AIキャラクター）の設定型
type AgentConfig = {
  name: string;
  description: string; // システムプロンプトに渡されるキャラクター設定
};

// 過去の会話セッションの型
type Session = {
  id: string;
  theme: string;
  timestamp: string; // ISO 8601形式
  agents: AgentConfig[];
  messages: Message[];
};

// デモ用のデフォルト値
const DEFAULTS = {
  theme: "友達に本音が言えない",
  agents: [
    { name: "武蔵", description: "江戸時代の侍。古風な口調（〜でござる）で話す。" },
    { name: "みか", description: "現代のギャル。ギャル語全開（マジで、じゃん、エモい）で話す。" },
  ] as AgentConfig[],
};

// localStorageのキー名。変更するとブラウザに保存済みの履歴が参照できなくなる
const STORAGE_KEY = "ai-chat-sessions";

export default function App() {
  const [theme, setTheme] = useState(DEFAULTS.theme);
  const [agents, setAgents] = useState<AgentConfig[]>(DEFAULTS.agents);
  const [turns, setTurns] = useState(6);
  const [messages, setMessages] = useState<Message[]>([]);
  const [running, setRunning] = useState(false);
  // activeTheme は会話開始後に確定したテーマを表示するために使用
  // 会話中にthemeを編集しても表示が変わらないようにする
  const [activeTheme, setActiveTheme] = useState("");
  const [done, setDone] = useState(false);

  // 過去セッション一覧（localStorageに永続化）
  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  // 閲覧中のセッション（nullなら現在の会話を表示）
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // sessionsが変わったらlocalStorageに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  /**
   * 指定したインデックスのエージェント設定を部分更新する
   * immutableに更新するため map で新しい配列を返す
   */
  const updateAgent = (idx: number, field: keyof AgentConfig, value: string) => {
    setAgents((prev) => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  /**
   * 会話を開始してSSEで発言を受信する
   * EventSource APIを使ってサーバーからのリアルタイム配信を受け取る
   */
  const startChat = () => {
    setMessages([]);
    setDone(false);
    setRunning(true);
    setActiveTheme(theme);
    setViewingSession(null); // 履歴閲覧から抜けてライブ表示に戻す

    // クロージャのキャプチャ問題を避けるため、開始時点の値をスナップショットとして保持する
    // SSE受信中にユーザーがフォームを編集しても、保存されるセッションには開始時の設定が入る
    const snapshotTheme = theme;
    const snapshotAgents = agents;
    // Reactのstateは非同期更新のため、done時点では最新のmessagesを参照できない
    // ローカル配列に都度pushしてセッション保存時に参照する
    const collectedMessages: Message[] = [];

    // 設定をクエリパラメータとしてサーバーへ渡す
    const params = new URLSearchParams({
      theme,
      turns: String(turns),
      agents: JSON.stringify(agents),
    });
    const es = new EventSource(`http://localhost:3001/chat?${params}`);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "message") {
        // 発言を受信するたびに末尾に追加してリアルタイム表示する
        const msg = data as Message;
        collectedMessages.push(msg);
        setMessages((prev) => [...prev, msg]);
      } else if (data.type === "done") {
        setRunning(false);
        setDone(true);
        es.close();
        // 完了したセッションを履歴に保存する
        const session: Session = {
          id: crypto.randomUUID(),
          theme: snapshotTheme,
          timestamp: new Date().toISOString(),
          agents: snapshotAgents,
          messages: collectedMessages,
        };
        // 新しいセッションを先頭に追加して、履歴パネルでは新しい順に表示する
        setSessions((prev) => [session, ...prev]);
      } else if (data.type === "error") {
        console.error(data.message);
        setRunning(false);
        es.close();
      }
    };
  };

  // 表示中のメッセージ（履歴閲覧中はそのセッション、それ以外は現在の会話）
  const displayMessages = viewingSession ? viewingSession.messages : messages;
  const displayTheme = viewingSession ? viewingSession.theme : activeTheme;
  const displayDone = viewingSession ? true : done;

  /**
   * ISO 8601のタイムスタンプを履歴リスト向けの短い表示形式に変換する
   * 例: "2024-03-28T15:04:00.000Z" → "3/28 15:04"
   */
  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🤖 AI会話デモ</h1>
        {/* 履歴が1件以上あるときだけ表示。件数をラベルに出してすぐ把握できるようにする */}
        {sessions.length > 0 && (
          <button
            className="history-toggle"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? "閉じる" : `履歴 (${sessions.length})`}
          </button>
        )}
      </div>

      {/* 履歴パネル：過去セッションを新しい順に一覧表示する */}
      {showHistory && (
        <div className="history-panel">
          {sessions.map((s) => (
            <button
              key={s.id}
              className={`history-item ${viewingSession?.id === s.id ? "active" : ""}`}
              onClick={() => {
                setViewingSession(s);
                setShowHistory(false); // 選択後はパネルを閉じてチャットエリアに集中させる
              }}
            >
              <span className="history-theme">{s.theme}</span>
              <span className="history-meta">
                {s.agents.map((a) => a.name).join(" × ")} · {s.messages.length}発言 · {formatTimestamp(s.timestamp)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 履歴閲覧中バナー */}
      {viewingSession && (
        <div className="viewing-banner">
          <span>履歴を閲覧中</span>
          <button onClick={() => setViewingSession(null)}>現在の会話に戻る</button>
        </div>
      )}

      {/* 会話設定フォーム（履歴閲覧中・会話中は非表示） */}
      {!viewingSession && (
        <>
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

            {/* エージェント数は agents 配列の長さで決まる（現在は2体固定） */}
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
        </>
      )}

      {displayTheme && <p className="theme">テーマ：「{displayTheme}」</p>}

      {/* チャット表示エリア：agent0は左、agent1は右に表示 */}
      <div className="chat-area">
        {displayMessages.map((msg, i) => (
          <div key={i} className={`bubble ${msg.speaker}`}>
            <span className="name">{msg.name}</span>
            <p>{msg.text}</p>
          </div>
        ))}
        {running && <div className="typing">考え中...</div>}
        {displayDone && displayMessages.length > 0 && <div className="done">— 会話終了 —</div>}
      </div>
    </div>
  );
}
