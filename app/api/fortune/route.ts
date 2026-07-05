import { NextRequest, NextResponse } from "next/server";
import { generateFortune, validateFortuneInput } from "@/lib/generateFortune";
import { generateSoloFortune, validateSoloInput } from "@/lib/generateSoloFortune";

// 占い生成に最大60秒かかるため関数のタイムアウトを延長
export const maxDuration = 60;

// 無料・テスト用の占いエンドポイント。mode:"solo" で一人占い、それ以外は相性占い。
// 決済モード（NEXT_PUBLIC_STRIPE_PUBLIC_KEY 設定時）はフロントが /api/pay/fortune を使う。
export async function POST(req: NextRequest) {
  try {
    const { mode, ...input } = await req.json();

    if (mode === "solo") {
      const err = validateSoloInput(input);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      return NextResponse.json(await generateSoloFortune(input));
    }

    const validationError = validateFortuneInput(input);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    return NextResponse.json(await generateFortune(input));
  } catch (error) {
    console.error("fortune error:", error);
    return NextResponse.json({ error: "占いに失敗しました。しばらく後にお試しください。" }, { status: 500 });
  }
}
