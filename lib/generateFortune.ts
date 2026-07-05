// lib/generateFortune.ts
// 占い生成の中核ロジック。/api/fortune（無料・テスト）と /api/pay（決済後）の両方から使う。
import Anthropic from "@anthropic-ai/sdk";
import { calcAll, calcCompatibilityScores } from "@/lib/fortuneCalculators";

export interface FortuneInput {
  name1: string; birth1: string; time1?: string; blood1: string; gender1?: string;
  name2: string; birth2: string; time2?: string; blood2: string; gender2?: string;
  category: string;
}

// 生成した占い結果（Claudeが返すJSON + score）
export type FortuneResult = Record<string, unknown> & { score: number };

export function validateFortuneInput(input: Partial<FortuneInput>): string | null {
  if (!input.name1 || !input.birth1 || !input.name2 || !input.birth2) {
    return "必須項目が不足しています";
  }
  return null;
}

export async function generateFortune(input: FortuneInput): Promise<FortuneResult> {
  const {
    name1, birth1, time1 = "", blood1, gender1 = "不明",
    name2, birth2, time2 = "", blood2, gender2 = "不明", category,
  } = input;

  // ── 事前計算（Claudeに計算させない） ──
  // 出生時刻（HH:mm）は任意。あれば時柱の算出＋節入り・カスプの時刻判定に使う
  const timeKnown1 = /^\d{2}:\d{2}$/.test(time1);
  const timeKnown2 = /^\d{2}:\d{2}$/.test(time2);
  const birth1Date = new Date(birth1 + "T" + (timeKnown1 ? time1 : "12:00") + ":00");
  const birth2Date = new Date(birth2 + "T" + (timeKnown2 ? time2 : "12:00") + ":00");
  const d1 = calcAll(birth1Date, name1, timeKnown1);
  const d2 = calcAll(birth2Date, name2, timeKnown2);
  const sc = calcCompatibilityScores(d1, d2, blood1, blood2, name1, name2);

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

  const prompt = `あなたは日本一の相性占い師AIです。
【重要ルール】
・あなた自身で生年月日からの計算（星座・干支・九星・数秘など）は絶対にしない。
・以下に正確な計算結果を渡すので、それだけを基に8占術の解釈・総合判断だけを行ってください。
・各占術の「score」「totalScore」は事前に数学的に算出した固定値を指定します。その数値を必ずそのまま使用し、変更しないでください。
・占術ごとの「compatible」「incompatible」「person1Trait」「person2Trait」「deepRead」のテキストのみを生成すること。

【あなた】名前「${name1}」性別「${gender1}」血液型「${blood1}型」
【相手】名前「${name2}」性別「${gender2}」血液型「${blood2}型」

【事前計算済みデータ（必ずこれを使用）】
● 西洋占星術（太陽星座）
  ${name1}: ${d1.sunSign}
  ${name2}: ${d2.sunSign}

● 四柱推命
  ※性格・相性の解釈は日柱の天干「日主」を中心に行うこと
  ${name1}: 年柱 ${d1.yearPillar} / 月柱 ${d1.monthPillar} / 日柱 ${d1.dayPillar}（日主：${d1.dayPillar[0]}）${d1.hourPillar ? ` / 時柱 ${d1.hourPillar}` : "（出生時刻不明のため時柱省略）"}
  ${name2}: 年柱 ${d2.yearPillar} / 月柱 ${d2.monthPillar} / 日柱 ${d2.dayPillar}（日主：${d2.dayPillar[0]}）${d2.hourPillar ? ` / 時柱 ${d2.hourPillar}` : "（出生時刻不明のため時柱省略）"}

● 九星気学（本命星）
  ${name1}: ${d1.kyusei}
  ${name2}: ${d2.kyusei}

● 数秘術（ライフパスナンバー）
  ${name1}: ${d1.lifePath}
  ${name2}: ${d2.lifePath}

● カバラ数秘術（カバラナンバー）
  ${name1}: ${d1.kabbalahNumber}
  ${name2}: ${d2.kabbalahNumber}

● 運命数（デスティニーナンバー）
  ${name1}: ${d1.destinyNumber}
  ${name2}: ${d2.destinyNumber}

● 血液型
  ${name1}: ${blood1}型
  ${name2}: ${blood2}型

上記データと事前計算スコアを基に「${categoryLabel}」の相性を8占術で診断し、指定のJSON形式のみで返してください。
【事前計算スコア（必ずこの数値を使用。変更禁止）】
totalScore: ${sc.total}
西洋占星術: ${sc.sunSign} / 四柱推命: ${sc.fourPillars} / 数秘術: ${sc.lifePath} / タロット: ${sc.tarot}
九星気学: ${sc.kyusei} / 血液型: ${sc.blood} / 姓名判断: ${sc.nameReading} / カバラ数秘術: ${sc.kabbalah}

出力するJSONの形式（このJSON構造のみを返すこと。文字列フィールド内にマークダウン記法を使わないこと）:

{
  "totalScore": ${sc.total},
  "oneliner": "<インパクトのある一言総評（20字以内）>",
  "fortunes": [
    {
      "name": "西洋占星術",
      "emoji": "⭐",
      "score": ${sc.sunSign},
      "person1Trait": "<${name1}（${d1.sunSign}）の性格特徴（15〜25文字）>",
      "person2Trait": "<${name2}（${d2.sunSign}）の性格特徴（15〜25文字）>",
      "compatible": "<合う理由を1〜2文で具体的に>",
      "incompatible": "<合わない・注意すべき点を1〜2文で具体的に>"
    },
    {
      "name": "四柱推命",
      "emoji": "🐉",
      "score": ${sc.fourPillars},
      "person1Trait": "<${name1}（日柱${d1.dayPillar}）の特徴（15〜25文字）>",
      "person2Trait": "<${name2}（日柱${d2.dayPillar}）の特徴（15〜25文字）>",
      "compatible": "<合う理由>",
      "incompatible": "<合わない・注意点>"
    },
    {
      "name": "数秘術",
      "emoji": "🔢",
      "score": ${sc.lifePath},
      "person1Trait": "<${name1}（ライフパス${d1.lifePath}）の特徴（15〜25文字）>",
      "person2Trait": "<${name2}（ライフパス${d2.lifePath}）の特徴（15〜25文字）>",
      "compatible": "<合う理由>",
      "incompatible": "<合わない・注意点>"
    },
    {
      "name": "タロット",
      "emoji": "🎴",
      "score": ${sc.tarot},
      "person1Trait": "<${name1}を象徴するタロットカードと意味（15〜25文字）>",
      "person2Trait": "<${name2}を象徴するタロットカードと意味（15〜25文字）>",
      "compatible": "<引いたカード名と合う象徴>",
      "incompatible": "<課題を示す側面>"
    },
    {
      "name": "九星気学",
      "emoji": "🌺",
      "score": ${sc.kyusei},
      "person1Trait": "<${name1}（${d1.kyusei}）の特徴（15〜25文字）>",
      "person2Trait": "<${name2}（${d2.kyusei}）の特徴（15〜25文字）>",
      "compatible": "<合う理由>",
      "incompatible": "<合わない・注意点>"
    },
    {
      "name": "血液型",
      "emoji": "🩸",
      "score": ${sc.blood},
      "person1Trait": "<${name1}の血液型から見た性格特徴（15〜25文字）>",
      "person2Trait": "<${name2}の血液型から見た性格特徴（15〜25文字）>",
      "compatible": "<合う理由>",
      "incompatible": "<合わない・注意点>"
    },
    {
      "name": "姓名判断",
      "emoji": "📝",
      "score": ${sc.nameReading},
      "person1Trait": "<${name1}の姓名判断から見た運勢・特徴（15〜25文字）>",
      "person2Trait": "<${name2}の姓名判断から見た運勢・特徴（15〜25文字）>",
      "compatible": "<合う理由>",
      "incompatible": "<合わない・注意点>"
    },
    {
      "name": "カバラ数秘術",
      "emoji": "✡️",
      "score": ${sc.kabbalah},
      "person1Trait": "<${name1}（カバラナンバー${d1.kabbalahNumber}）の特徴（15〜25文字）>",
      "person2Trait": "<${name2}（カバラナンバー${d2.kabbalahNumber}）の特徴（15〜25文字）>",
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

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: "あなたはJSONのみを出力するAPIです。いかなる場合も、純粋なJSONオブジェクトのみを返してください。説明文・マークダウン・コードブロック(```json等)・改行コメント等は一切含めないでください。最初の文字は必ず { で始まり、最後の文字は } で終わること。",
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("JSON形式の応答が取得できませんでした");

  const parsed = JSON.parse(jsonMatch[0]);
  const score = typeof parsed.totalScore === "number" ? parsed.totalScore : 75;

  // X自動投稿（オプション）
  if (process.env.X_AUTO_POST === "true") {
    await postToX(name1, name2, category, score).catch(console.error);
  }

  return { ...parsed, score };
}

export async function postToX(name1: string, name2: string, category: string, score: number) {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return;

  const text = `🔮 たった200円でここまでわかる！\nAI相性占いで${category}相性を8占術で完全分析✨\n\n西洋占星術・四柱推命・タロット・数秘術など8つを同時診断→ ${process.env.NEXT_PUBLIC_BASE_URL}\n#AI相性占い #${category}占い #相性診断`;

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
