import { NextRequest, NextResponse } from "next/server";
import { generateFortune, validateFortuneInput } from "@/lib/generateFortune";

// 無料・テスト用の占いエンドポイント。
// 決済モード（NEXT_PUBLIC_PAYJP_PUBLIC_KEY 設定時）はフロントが /api/pay を使う。
export async function POST(req: NextRequest) {
  try {
    const input = await req.json();
    const validationError = validateFortuneInput(input);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const result = await generateFortune(input);
    return NextResponse.json(result);
  } catch (error) {
    console.error("fortune error:", error);
    return NextResponse.json({ error: "占いに失敗しました。しばらく後にお試しください。" }, { status: 500 });
  }
}
