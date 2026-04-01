// 毎日自動投稿API（Vercel Cron Jobs or 外部cronで叩く）
// GET /api/daily-post?secret=YOUR_CRON_SECRET

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createHmac } from "crypto";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

export async function GET(req: NextRequest) {
  // セキュリティ: secretキーで保護
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = getClient();

    // 今日の日付
    const today = new Date().toLocaleDateString("ja-JP", {
      year: "numeric", month: "long", day: "numeric", weekday: "long",
    });

    // パターンをランダムに選んで宣伝投稿を生成
    const patterns = [
      "ユーザーの声・体験談風（実際に使って驚いた系）",
      "サービスの特徴・強みをアピール（8占術・AI・即時診断）",
      "使いどころを具体的に紹介（付き合う前・転職前・結婚前など）",
      "数字で魅せる（8占術・300円・15秒・100点満点など）",
      "問いかけ型（あなたの相性は何点？など）",
    ];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `「AI相性占い」サービスのX宣伝投稿文を作成してください。

## サービス概要
- 名前：AI相性占い
- 内容：恋愛・結婚・仕事・SEXの相性をClaudeが8占術で診断
- 価格：1回300円
- 特徴：西洋占星術・四柱推命・数秘術・タロット・九星気学・血液型・姓名判断・カバラの8つを同時分析
- URL：${process.env.NEXT_PUBLIC_BASE_URL}

## 今日の投稿パターン
${pattern}

## 条件
- 120文字以内（URLを含めない）
- 絵文字3〜5個
- ハッシュタグ2〜3個（#AI相性占い #恋愛占い など）
- サービスURLへの誘導で締める（「詳しくはプロフのリンクから」など）

投稿文のみ出力（説明不要）：`,
      }],
    });

    const postText = message.content[0].type === "text"
      ? message.content[0].text.trim() + `\n🔮 無料で試す→ ${process.env.NEXT_PUBLIC_BASE_URL}`
      : "";

    if (!postText) throw new Error("投稿文の生成に失敗しました");

    // Xに投稿
    const tweetResult = await postToX(postText);

    return NextResponse.json({ success: true, text: postText, tweet: tweetResult });
  } catch (error) {
    console.error("daily-post error:", error);
    return NextResponse.json({ error: "投稿に失敗しました" }, { status: 500 });
  }
}

async function postToX(text: string) {
  const apiKey = process.env.X_API_KEY!;
  const apiSecret = process.env.X_API_SECRET!;
  const accessToken = process.env.X_ACCESS_TOKEN!;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).slice(2);
  const url = "https://api.twitter.com/2/tweets";

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

  const baseStr = `POST&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`;
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;
  const signature = createHmac("sha1", signingKey).update(baseStr).digest("base64");

  const authHeader = "OAuth " + Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(", ");

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  return await res.json();
}
