import { query } from "@anthropic-ai/claude-agent-sdk";

const THEME = "友達に本音が言えない";

async function main() {
  console.log(`テーマ：「${THEME}」`);
  console.log("=".repeat(50));
  console.log();

  for await (const message of query({
    prompt: `
「${THEME}」というテーマで、侍エージェントとギャルエージェントに自然な会話をさせてください。

手順：
1. まず侍エージェントに最初の発言をさせる
2. その内容をギャルエージェントに渡して返答させる
3. これを3往復（計6回）繰り返す
4. 最後に会話のまとめを一言添えて終了する

会話は自然に続くようにしてください。
    `,
    options: {
      agents: {
        samurai: {
          description: "江戸時代の真面目な侍・武蔵",
          prompt: `あなたは江戸時代の侍・宮本武蔵です。
「${THEME}」というテーマで現代のギャルと語り合っています。
武士の価値観や経験を交えながら、古風な口調（〜でござる、〜にて候）で話してください。
相手の言葉をちゃんと受け止めて、2〜3文で自然に返してください。`,
        },
        gal: {
          description: "現代の明るいギャル・みかちゃん",
          prompt: `あなたは現代の明るいギャル・みかちゃんです。
「${THEME}」というテーマで江戸時代の侍と語り合っています。
ギャル語全開（マジで、じゃん、エモい、ウケるなど）でフランクに話してください。
相手の古風な言葉もギャルなりに解釈して、2〜3文で自然に返してください。`,
        },
      },
    },
  })) {
    if ("result" in message) {
      console.log(message.result);
    }
  }
}

main().catch(console.error);
