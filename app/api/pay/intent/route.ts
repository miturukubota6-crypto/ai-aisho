import { NextRequest, NextResponse } from "next/server";

const STRIPE_API = "https://api.stripe.com/v1";
const PRICE_JPY = 500;

// Stripe PaymentIntent を作成し client_secret を返す（カード決済専用）
export async function POST(_req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "決済は現在準備中です" }, { status: 503 });
    }

    const res = await fetch(`${STRIPE_API}/payment_intents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(PRICE_JPY),
        currency: "jpy",
        // Payment Element(自動)と一致させる。リダイレクト系は無効化しカード＋Apple Pay/Google Payに限定
        "automatic_payment_methods[enabled]": "true",
        "automatic_payment_methods[allow_redirects]": "never",
        description: "AI相性占い 8占術診断",
      }).toString(),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error("stripe intent failed:", json?.error);
      return NextResponse.json({ error: "決済の初期化に失敗しました" }, { status: 500 });
    }
    return NextResponse.json({ clientSecret: json.client_secret, id: json.id });
  } catch (e) {
    console.error("intent error:", e);
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }
}
