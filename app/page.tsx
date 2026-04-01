"use client";

import { useState } from "react";
import { Loader2, Heart, Share2, RotateCcw } from "lucide-react";

const BLOOD_TYPES = ["A", "B", "O", "AB", "不明"];
const CATEGORIES = ["恋愛", "結婚", "仕事", "SEX"] as const;
type Category = (typeof CATEGORIES)[number];

interface FormState {
  name1: string;
  birth1: string;
  blood1: string;
  name2: string;
  birth2: string;
  blood2: string;
  category: Category;
}

export default function Home() {
  const [form, setForm] = useState<FormState>({
    name1: "", birth1: "", blood1: "A",
    name2: "", birth2: "", blood2: "A",
    category: "恋愛",
  });
  const [step, setStep] = useState<"form" | "result">("form");
  const [result, setResult] = useState("");
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleFortune = async () => {
    if (!form.name1 || !form.birth1 || !form.name2 || !form.birth2) {
      setError("必須項目を入力してください");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/fortune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
      setScore(data.score);
      setStep("result");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const shareText = `💕 ${form.name1}×${form.name2}の${form.category}相性は${score}点！\nAIが8占術で本気診断しました✨`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🔮</div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            AI相性占い
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Claude AIが8占術で本気診断｜1回300円</p>
          {/* カテゴリ選択 */}
          <div className="flex gap-2 justify-center mt-4 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => update("category", c)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                  form.category === c
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg scale-105"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-pink-300"
                }`}
              >
                {c === "恋愛" ? "💕 恋愛" : c === "結婚" ? "💍 結婚" : c === "仕事" ? "💼 仕事" : "🔥 SEX"}
              </button>
            ))}
          </div>
        </div>

        {step === "form" && (
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
            {/* あなた */}
            <div>
              <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-1">
                <Heart size={16} className="text-pink-500 fill-pink-500" /> あなた
              </h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="名前 *"
                  value={form.name1}
                  onChange={e => update("name1", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-300 text-gray-900"
                />
                <input
                  type="date"
                  value={form.birth1}
                  onChange={e => update("birth1", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-300 text-gray-900"
                />
                <select
                  value={form.blood1}
                  onChange={e => update("blood1", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-300 text-gray-900 bg-white"
                >
                  {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}型</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-2xl">💞</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* 相手 */}
            <div>
              <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-1">
                <Heart size={16} className="text-purple-500 fill-purple-500" /> 相手
              </h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="名前 *"
                  value={form.name2}
                  onChange={e => update("name2", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900"
                />
                <input
                  type="date"
                  value={form.birth2}
                  onChange={e => update("birth2", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900"
                />
                <select
                  value={form.blood2}
                  onChange={e => update("blood2", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900 bg-white"
                >
                  {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}型</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <p className="text-xs text-gray-400 text-center">
              ※ テスト版のため現在無料。正式版はPay.jpで300円の決済が入ります。
            </p>

            <button
              onClick={handleFortune}
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-5 rounded-2xl text-xl font-black hover:opacity-90 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={22} className="animate-spin" />占い中（約15秒）...</>
              ) : (
                <>🔮 {form.category}相性を今すぐ診断する（300円）</>
              )}
            </button>
          </div>
        )}

        {step === "result" && (
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <div className="text-center mb-6">
              <p className="text-gray-500 text-sm mb-1">{form.name1} × {form.name2} の{form.category}相性</p>
              <div className="text-7xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                {score}<span className="text-4xl">点</span>
              </div>
              <div className="mt-3 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>

            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-5">
              {result}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank")}
                className="flex-1 bg-black text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm hover:opacity-80"
              >
                <Share2 size={16} />Xでシェア
              </button>
              <button
                onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`, "_blank")}
                className="flex-1 bg-green-500 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm hover:opacity-80"
              >
                LINEで送る
              </button>
            </div>

            <button
              onClick={() => { setStep("form"); setResult(""); setScore(0); }}
              className="w-full mt-3 border border-gray-200 text-gray-600 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm hover:bg-gray-50"
            >
              <RotateCcw size={16} />別の組み合わせを占う
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          占い結果はエンターテインメントです。参考程度にお楽しみください。
        </p>
      </div>
    </main>
  );
}
