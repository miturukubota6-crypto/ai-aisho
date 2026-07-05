// lib/generateSoloFortune.ts
// 一人占い（1人を8項目で鑑定）の生成ロジック。
import Anthropic from "@anthropic-ai/sdk";
import { calcAll, calcSoloScores } from "@/lib/fortuneCalculators";

export interface SoloInput {
  name: string; birth: string; time?: string; blood: string; gender?: string;
}

export type SoloResult = Record<string, unknown> & { score: number };

export function validateSoloInput(input: Partial<SoloInput>): string | null {
  if (!input.name || !input.birth) return "必須項目が不足しています";
  return null;
}

export async function generateSoloFortune(input: SoloInput): Promise<SoloResult> {
  const { name, birth, time = "", blood = "不明", gender = "不明" } = input;

  const timeKnown = /^\d{2}:\d{2}$/.test(time);
  const birthDate = new Date(birth + "T" + (timeKnown ? time : "12:00") + ":00");
  const d = calcAll(birthDate, name, timeKnown);
  const sc = calcSoloScores(d);

  const prompt = `あなたは日本一の占い師AIです。1人のお客様を8項目で鑑定します。
【重要ルール】
・あなた自身で生年月日からの計算（星座・干支・九星・数秘など）は絶対にしない。以下の計算結果だけを使う。
・各項目の「score」は事前に算出した固定値。必ずそのまま使い、変更しないこと。
・鑑定文（reading等のテキスト）だけを、具体的・前向き・その人に刺さる言葉で生成すること。

【お客様】名前「${name}」性別「${gender}」血液型「${blood}型」

【鑑定データ（必ずこれを使用）】
● 西洋占星術（太陽星座）: ${d.sunSign}
● 四柱推命: 日柱 ${d.dayPillar}（日主：${d.dayPillar[0]}）/ 年柱 ${d.yearPillar} / 月柱 ${d.monthPillar}${d.hourPillar ? ` / 時柱 ${d.hourPillar}` : "（出生時刻不明のため時柱省略）"}
  ※性格・運勢の解釈は日柱の天干「日主」を中心に行うこと
● 九星気学（本命星）: ${d.kyusei}
● 数秘術（ライフパスナンバー）: ${d.lifePath}
● カバラ数秘術: ${d.kabbalahNumber}
● 運命数: ${d.destinyNumber}
● 血液型: ${blood}型

【事前計算スコア（必ずこの数値を使用。変更禁止）】
総合運:${sc.overall} / 性格:${sc.personality} / 仕事運:${sc.work} / 金運:${sc.money} / 恋愛運:${sc.love} / 結婚運:${sc.marriage} / 健康運:${sc.health}

上記データを基に鑑定し、次のJSON形式のみで返してください（文字列内にマークダウンを使わない）:

{
  "totalScore": ${sc.overall},
  "oneliner": "<この人を表すインパクトのある一言（20字以内）>",
  "profile": "<${name}さんの人物像・本質を鑑定データに基づき具体的に（100〜130字）>",
  "categories": [
    { "name": "総合運", "emoji": "🌟", "score": ${sc.overall}, "reading": "<総合的な運勢の流れ・強み（60〜90字）>" },
    { "name": "性格・気質", "emoji": "🧭", "score": ${sc.personality}, "reading": "<本質的な性格・気質・長所と短所（60〜90字）>" },
    { "name": "仕事運・適職", "emoji": "💼", "score": ${sc.work}, "reading": "<仕事での強み・活かし方（50〜80字）>", "aptitude": "<向いている仕事・働き方（30〜45字）>" },
    { "name": "金運", "emoji": "💰", "score": ${sc.money}, "reading": "<お金との付き合い方・金運を上げるコツ（60〜90字）>" },
    { "name": "恋愛運", "emoji": "💕", "score": ${sc.love}, "reading": "<恋愛傾向・モテ方・相性の良いタイプ（60〜90字）>" },
    { "name": "結婚運", "emoji": "💍", "score": ${sc.marriage}, "reading": "<結婚に向く時期・パートナー像・家庭運（60〜90字）>" },
    { "name": "健康運", "emoji": "🍀", "score": ${sc.health}, "reading": "<体質傾向・気をつける点・整え方（60〜90字）>" }
  ],
  "luckyAdvice": [
    "<今日から実践できる開運アドバイス1（具体的）>",
    "<開運アドバイス2>",
    "<開運アドバイス3>"
  ],
  "luckyItem": "<ラッキーアイテム>",
  "luckyColor": "<ラッキーカラー>"
}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3500,
    system: "あなたはJSONのみを出力するAPIです。純粋なJSONオブジェクトのみを返し、説明文・マークダウン・コードブロックは一切含めないでください。最初の文字は { 、最後の文字は } とすること。",
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("JSON形式の応答が取得できませんでした");

  const parsed = JSON.parse(jsonMatch[0]);
  const score = typeof parsed.totalScore === "number" ? parsed.totalScore : sc.overall;
  return { ...parsed, score };
}
