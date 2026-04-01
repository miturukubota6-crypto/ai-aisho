import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

export async function POST(req: NextRequest) {
  try {
    const { name1, birth1, blood1, name2, birth2, blood2, category } = await req.json();

    if (!name1 || !birth1 || !name2 || !birth2) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const categoryLabel = {
      恋愛: "恋愛・恋人関係",
      結婚: "結婚・夫婦生活",
      仕事: "仕事・ビジネス",
      SEX: "性的相性・肉体的相性",
    }[category as string] || "恋愛";

    const prompt = `あなたは日本最高峰の相性占い師AIです。
以下の2人の「${categoryLabel}」の相性を、8つの占術をすべて使って本気で総合判断してください。

【あなた】名前：${name1} / 生年月日：${birth1} / 血液型：${blood1}型
【相手】名前：${name2} / 生年月日：${birth2} / 血液型：${blood2}型

## 使用する8占術
1. 西洋占星術（星座・シナストリーチャート）
2. 四柱推命（生年月日から命式を算出）
3. 数秘術（誕生数・運命数）
4. タロット（ランダムで1枚引き、象徴を解釈）
5. 九星気学（本命星の相性）
6. 血液型性格診断
7. 姓名判断（名前の画数と音の相性）
8. カバラ数秘術

## 出力形式（必ずこの形式を守ること）

【総合${category}相性スコア】XX点/100点

【一言総評】
（インパクトある一言）

【8占術の詳細結果】

★ 西洋占星術：（星座と惑星配置から見た相性）
★ 四柱推命：（五行バランスから見た相性）
★ 数秘術：（誕生数から見た相性）
★ タロット：（カード名）→（象徴と2人への意味）
★ 九星気学：（本命星の組み合わせ）
★ 血液型：（組み合わせの特徴）
★ 姓名判断：（名前から見た縁）
★ カバラ：（魂の数から見た繋がり）

【${category}における2人の関係の深読み】
（200文字以上で具体的に）

【運命の転換点】
（この2人にとって重要な時期・タイミング）

【${category}アドバイス】
（超具体的な行動アドバイスを3つ）

スコアは0〜100で必ず数字のみを【総合${category}相性スコア】の後に書いてください。`;

    const client = getClient();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    });

    const resultText = message.content[0].type === "text" ? message.content[0].text : "";

    // スコアを抽出
    const scoreMatch = resultText.match(/【総合.+スコア】\s*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;

    // X自動投稿（オプション）
    if (process.env.X_AUTO_POST === "true") {
      await postToX(name1, name2, category, score).catch(console.error);
    }

    return NextResponse.json({ result: resultText, score });
  } catch (error) {
    console.error("fortune error:", error);
    return NextResponse.json({ error: "占いに失敗しました。しばらく後にお試しください。" }, { status: 500 });
  }
}

async function postToX(name1: string, name2: string, category: string, score: number) {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return;

  const text = `🔮 たった300円でここまでわかる！\nAI相性占いで${category}相性を8占術で完全分析✨\n\n西洋占星術・四柱推命・タロット・数秘術など8つを同時診断→ ${process.env.NEXT_PUBLIC_BASE_URL}\n#AI相性占い #${category}占い #相性診断`;

  // Twitter API v2 OAuth1.0a
  const { createHmac } = await import("crypto");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).slice(2);
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const paramStr = Object.entries(oauthParams)
    .sort()
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const baseStr = `POST&${encodeURIComponent("https://api.twitter.com/2/tweets")}&${encodeURIComponent(paramStr)}`;
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;
  const signature = createHmac("sha1", signingKey).update(baseStr).digest("base64");

  const authHeader = "OAuth " + Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(", ");

  await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}
