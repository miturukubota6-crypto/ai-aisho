import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createHmac } from "crypto";

// LINE Messaging API
const LINE_API = "https://api.line.me/v2/bot/message/reply";

function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

// LINE署名検証
function verifyLineSignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET!;
  const hash = createHmac("sha256", secret).update(body).digest("base64");
  return hash === signature;
}

async function replyToLine(replyToken: string, messages: object[]) {
  await fetch(LINE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}

// ユーザーの入力状態を管理（本番はRedis/Supabaseで管理推奨）
const userStates = new Map<string, { step: string; data: Record<string, string> }>();

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") || "";

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events = body.events || [];

  for (const event of events) {
    if (event.type !== "message" || event.message.type !== "text") continue;

    const userId = event.source.userId;
    const text = event.message.text.trim();
    const replyToken = event.replyToken;
    const state = userStates.get(userId) || { step: "idle", data: {} };

    // メニュー・リセット
    if (text === "占う" || text === "メニュー" || text === "スタート") {
      userStates.set(userId, { step: "select_category", data: {} });
      await replyToLine(replyToken, [{
        type: "template",
        altText: "相性診断メニュー",
        template: {
          type: "buttons",
          title: "🔮 AI相性占い",
          text: "何の相性を診断しますか？",
          actions: [
            { type: "message", label: "💕 恋愛相性", text: "恋愛" },
            { type: "message", label: "💍 結婚相性", text: "結婚" },
            { type: "message", label: "💼 仕事相性", text: "仕事" },
            { type: "message", label: "🔥 SEX相性", text: "SEX" },
          ],
        },
      }]);
      continue;
    }

    // カテゴリ選択
    if (state.step === "select_category" && ["恋愛", "結婚", "仕事", "SEX"].includes(text)) {
      userStates.set(userId, { step: "input_name1", data: { category: text } });
      await replyToLine(replyToken, [{
        type: "text",
        text: `${text}相性を診断します！\n\nまずあなたの名前を教えてください。`,
      }]);
      continue;
    }

    // あなたの名前
    if (state.step === "input_name1") {
      userStates.set(userId, { step: "input_birth1", data: { ...state.data, name1: text } });
      await replyToLine(replyToken, [{
        type: "text",
        text: `${text}さんですね✨\nあなたの生年月日を教えてください。\n\n例：1995/05/15`,
      }]);
      continue;
    }

    // あなたの生年月日
    if (state.step === "input_birth1") {
      userStates.set(userId, { step: "input_blood1", data: { ...state.data, birth1: text } });
      await replyToLine(replyToken, [{
        type: "template",
        altText: "血液型選択",
        template: {
          type: "buttons",
          text: "あなたの血液型は？",
          actions: [
            { type: "message", label: "A型", text: "blood1_A" },
            { type: "message", label: "B型", text: "blood1_B" },
            { type: "message", label: "O型", text: "blood1_O" },
            { type: "message", label: "AB型", text: "blood1_AB" },
          ],
        },
      }]);
      continue;
    }

    // あなたの血液型
    if (state.step === "input_blood1" && text.startsWith("blood1_")) {
      const blood1 = text.replace("blood1_", "");
      userStates.set(userId, { step: "input_name2", data: { ...state.data, blood1 } });
      await replyToLine(replyToken, [{
        type: "text",
        text: `次に相手の名前を教えてください。`,
      }]);
      continue;
    }

    // 相手の名前
    if (state.step === "input_name2") {
      userStates.set(userId, { step: "input_birth2", data: { ...state.data, name2: text } });
      await replyToLine(replyToken, [{
        type: "text",
        text: `${text}さんですね💞\n${text}さんの生年月日を教えてください。\n\n例：1998/08/22`,
      }]);
      continue;
    }

    // 相手の生年月日
    if (state.step === "input_birth2") {
      userStates.set(userId, { step: "input_blood2", data: { ...state.data, birth2: text } });
      await replyToLine(replyToken, [{
        type: "template",
        altText: "血液型選択",
        template: {
          type: "buttons",
          text: `${state.data.name2}さんの血液型は？`,
          actions: [
            { type: "message", label: "A型", text: "blood2_A" },
            { type: "message", label: "B型", text: "blood2_B" },
            { type: "message", label: "O型", text: "blood2_O" },
            { type: "message", label: "AB型", text: "blood2_AB" },
          ],
        },
      }]);
      continue;
    }

    // 相手の血液型 → 占い実行
    if (state.step === "input_blood2" && text.startsWith("blood2_")) {
      const blood2 = text.replace("blood2_", "");
      const d = { ...state.data, blood2 } as Record<string, string>;
      userStates.set(userId, { step: "idle", data: {} });

      await replyToLine(replyToken, [{
        type: "text",
        text: `🔮 ${d.name1}さん×${d.name2}さんの${d.category}相性を8占術で診断中...\n少々お待ちください（約15秒）✨`,
      }]);

      // Claude API呼び出し
      try {
        const client = getAnthropicClient();
        const prompt = buildPrompt(d.name1, d.birth1, d.blood1, d.name2, d.birth2, blood2, d.category);
        const message = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        });
        const resultText = message.content[0].type === "text" ? message.content[0].text : "占い結果を取得できませんでした";
        const scoreMatch = resultText.match(/【総合.+スコア】\s*(\d+)/);
        const score = scoreMatch ? scoreMatch[1] : "??";

        // LINE は1メッセージ5000文字制限なので分割
        const chunks = splitText(resultText, 2000);
        const lineMessages = chunks.map(chunk => ({ type: "text", text: chunk }));
        lineMessages.push({
          type: "text",
          text: `💕 ${d.name1}×${d.name2}の${d.category}相性は${score}点！\nもう一度占う場合は「占う」と送ってください🔮`,
        });

        // pushMessageで結果送信（replyTokenは1回のみ使えるのでpush使用）
        await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({ to: userId, messages: lineMessages.slice(0, 5) }),
        });
      } catch (e) {
        console.error("LINE fortune error:", e);
        await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            to: userId,
            messages: [{ type: "text", text: "エラーが発生しました。もう一度「占う」と送ってください。" }],
          }),
        });
      }
      continue;
    }

    // デフォルト応答
    await replyToLine(replyToken, [{
      type: "text",
      text: `「占う」と送ると相性診断を始めます🔮`,
    }]);
  }

  return NextResponse.json({ ok: true });
}

function buildPrompt(name1: string, birth1: string, blood1: string, name2: string, birth2: string, blood2: string, category: string): string {
  return `日本最高峰の相性占い師として、${name1}（${birth1}生 ${blood1}型）と${name2}（${birth2}生 ${blood2}型）の「${category}」相性を8占術で診断してください。

出力形式：
【総合${category}相性スコア】XX点/100点
【一言総評】
【各占術の結果】（各1〜2行で簡潔に）
★西洋占星術：
★四柱推命：
★数秘術：
★タロット：
★九星気学：
★血液型：
★姓名判断：
★カバラ：
【${category}アドバイス】（3つ）

LINEで読みやすいよう簡潔にまとめてください。`;
}

function splitText(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxLen) {
    chunks.push(text.slice(i, i + maxLen));
  }
  return chunks;
}
