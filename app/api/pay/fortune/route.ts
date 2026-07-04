import { NextRequest, NextResponse } from "next/server";
import { generateFortune, validateFortuneInput } from "@/lib/generateFortune";

const STRIPE_API = "https://api.stripe.com/v1";
const PRICE_JPY = 500;

// 決済成功をサーバーで検証してから占いを生成（無銭診断・二重利用を防止）
export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId, ...input } = await req.json();

    const validationError = validateFortuneInput(input);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "決済は現在準備中です" }, { status: 503 });
    }
    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json({ error: "決済情報がありません" }, { status: 400 });
    }

    const authHeaders = { Authorization: `Bearer ${secretKey}` };

    // 決済の実在と成功をStripeに問い合わせて検証
    const piRes = await fetch(
      `${STRIPE_API}/payment_intents/${encodeURIComponent(paymentIntentId)}`,
      { headers: authHeaders }
    );
    const pi = await piRes.json();
    if (!piRes.ok) {
      return NextResponse.json({ error: "決済の確認に失敗しました" }, { status: 400 });
    }
    if (pi.status !== "succeeded" || pi.amount !== PRICE_JPY || pi.currency !== "jpy") {
      return NextResponse.json({ error: "決済が完了していません" }, { status: 402 });
    }
    // 同じ決済での二重取得を防止
    if (pi.metadata?.fortune_generated === "true") {
      return NextResponse.json({ error: "この決済はすでに利用済みです" }, { status: 409 });
    }

    // 占い生成
    const result = await generateFortune(input);

    // 決済を「利用済み」にマーク（ベストエフォート）
    await fetch(`${STRIPE_API}/payment_intents/${encodeURIComponent(paymentIntentId)}`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ "metadata[fortune_generated]": "true" }).toString(),
    }).catch((e) => console.error("metadata mark failed:", e));

    return NextResponse.json({ ...result, charged: true });
  } catch (e) {
    console.error("pay/fortune error:", e);
    return NextResponse.json({ error: "処理に失敗しました。しばらく後にお試しください。" }, { status: 500 });
  }
}
