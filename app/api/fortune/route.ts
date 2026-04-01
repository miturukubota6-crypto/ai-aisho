import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

export async function POST(req: NextRequest) {
  try {
    const { name1, birth1, blood1, gender1 = "不明", name2, birth2, blood2, gender2 = "不明", category } = await req.json();

    if (!name1 || !birth1 || !name2 || !birth2) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const categoryLabel = {
      恋愛: "恋愛・恋人関係",
      結婚: "結婚・夫婦生活",
      仕事: "仕事・ビジネス",
      SEX: "性的相性・肉体的相性",
    }[category as string] || "恋愛";

    const happyPointsInstruction = {
      恋愛: "相手が喜ぶポイント（超具体的なシーン・行動）",
      結婚: "結婚生活で幸せになれる具体的な場面・行動",
      仕事: "仕事でうまく協力できる具体的な場面・行動",
      SEX: "性的相性が高まる具体的な場面・状況",
    }[category as string] || "相手が喜ぶポイント（超具体的なシーン・行動）";

    const disappointPointsInstruction = {
      恋愛: "相手が幻滅する具体的なNG行動",
      結婚: "結婚生活で摩擦や不満が生まれやすい具体的な行動・状況",
      仕事: "仕事上でぶつかりやすい具体的な場面・行動",
      SEX: "性的相性で注意が必要な具体的な違い・状況",
    }[category as string] || "相手が幻滅する具体的なNG行動";

    const prompt = `以下の2人の「${categoryLabel}」の相性を8占術で診断し、指定のJSON形式のみで返してください。

診断対象:
- あなた: 名前「${name1}」性別「${gender1}」生年月日「${birth1}」血液型「${blood1}型」
- 相手: 名前「${name2}」性別「${gender2}」生年月日「${birth2}」血液型「${blood2}型」

使用する8占術: 西洋占星術・四柱推命・数秘術・タロット・九星気学・血液型性格診断・姓名判断・カバラ数秘術

出力するJSONの形式（このJSON構造のみを返すこと。文字列フィールド内にマークダウン記法を使わないこと）:

{
  "totalScore": <0〜100の整数>,
  "oneliner": "<インパクトのある一言総評（20字以内）>",
  "fortunes": [
    {
      "name": "西洋占星術",
      "emoji": "⭐",
      "score": <0〜100の整数>,
      "person1Trait": "<${name1}の西洋占星術的な性格特徴（15〜25文字）>",
      "person2Trait": "<${name2}の西洋占星術的な性格特徴（15〜25文字）>",
      "compatible": "<合う理由を1〜2文で具体的に>",
      "incompatible": "<合わない・注意すべき点を1〜2文で具体的に>"
    },
    {
      "name": "四柱推命",
      "emoji": "🐉",
      "score": <0〜100の整数>,
      "person1Trait": "<${name1}の四柱推命から見た特徴（15〜25文字）>",
      "person2Trait": "<${name2}の四柱推命から見た特徴（15〜25文字）>",
      "compatible": "<合う理由>",
      "incompatible": "<合わない・注意点>"
    },
    {
      "name": "数秘術",
      "emoji": "🔢",
      "score": <0〜100の整数>,
      "person1Trait": "<${name1}の数秘術から見た特徴（15〜25文字）>",
      "person2Trait": "<${name2}の数秘術から見た特徴（15〜25文字）>",
      "compatible": "<合う理由>",
      "incompatible": "<合わない・注意点>"
    },
    {
      "name": "タロット",
      "emoji": "🎴",
      "score": <0〜100の整数>,
      "person1Trait": "<${name1}を象徴するタロットカードと意味（15〜25文字）>",
      "person2Trait": "<${name2}を象徴するタロットカードと意味（15〜25文字）>",
      "compatible": "<引いたカード名と合う象徴>",
      "incompatible": "<課題を示す側面>"
    },
    {
      "name": "九星気学",
      "emoji": "🌺",
      "score": <0〜100の整数>,
      "person1Trait": "<${name1}の九星気学から見た特徴（15〜25文字）>",
      "person2Trait": "<${name2}の九星気学から見た特徴（15〜25文字）>",
      "compatible": "<合う理由>",
      "incompatible": "<合わない・注意点>"
    },
    {
      "name": "血液型",
      "emoji": "🩸",
      "score": <0〜100の整数>,
      "person1Trait": "<${name1}の血液型から見た性格特徴（15〜25文字）>",
      "person2Trait": "<${name2}の血液型から見た性格特徴（15〜25文字）>",
      "compatible": "<合う理由>",
      "incompatible": "<合わない・注意点>"
    },
    {
      "name": "姓名判断",
      "emoji": "📝",
      "score": <0〜100の整数>,
      "person1Trait": "<${name1}の姓名判断から見た運勢・特徴（15〜25文字）>",
      "person2Trait": "<${name2}の姓名判断から見た運勢・特徴（15〜25文字）>",
      "compatible": "<合う理由>",
      "incompatible": "<合わない・注意点>"
    },
    {
      "name": "カバラ数秘術",
      "emoji": "✡️",
      "score": <0〜100の整数>,
      "person1Trait": "<${name1}のカバラ数秘術から見た特徴（15〜25文字）>",
      "person2Trait": "<${name2}のカバラ数秘術から見た特徴（15〜25文字）>",
      "compatible": "<合う理由>",
      "incompatible": "<合わない・注意点>"
    }
  ],
  "deepRead": "<2人の関係の深読み。150〜200文字で具体的かつドラマチックに>",
  "cautions": [
    "<気を付けるべき点1（具体的に）>",
    "<気を付けるべき点2（具体的に）>",
    "<気を付けるべき点3（具体的に）>"
  ],
  "happyPoints": [
    "<${happyPointsInstruction}1>",
    "<${happyPointsInstruction}2>",
    "<${happyPointsInstruction}3>"
  ],
  "disappointPoints": [
    "<${disappointPointsInstruction}1>",
    "<${disappointPointsInstruction}2>",
    "<${disappointPointsInstruction}3>"
  ],
  "timingAdvice": "<この2人にとって重要な時期・タイミング（50〜80文字）>"
}`;

    const client = getClient();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: "あなたはJSONのみを出力するAPIです。いかなる場合も、純粋なJSONオブジェクトのみを返してください。説明文・マークダウン・コードブロック(```json等)・改行コメント等は一切含めないでください。最初の文字は必ず { で始まり、最後の文字は } で終わること。",
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    // JSONを抽出（コードブロックがある場合も対応）
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("JSON形式の応答が取得できませんでした");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const score = typeof parsed.totalScore === "number" ? parsed.totalScore : 75;

    // X自動投稿（オプション）
    if (process.env.X_AUTO_POST === "true") {
      await postToX(name1, name2, category, score).catch(console.error);
    }

    return NextResponse.json({ ...parsed, score });
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
