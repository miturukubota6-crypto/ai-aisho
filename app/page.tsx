"use client";

import { useState } from "react";
import { Loader2, Heart, Share2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

const BLOOD_TYPES = ["A", "B", "O", "AB", "不明"];
const CATEGORIES = ["恋愛", "結婚", "仕事", "SEX"] as const;
type Category = (typeof CATEGORIES)[number];

interface FortuneScore {
  name: string;
  emoji: string;
  score: number;
  person1Trait?: string;
  person2Trait?: string;
  compatible: string;
  incompatible: string;
}

interface FortuneResult {
  totalScore: number;
  score: number;
  oneliner: string;
  fortunes: FortuneScore[];
  deepRead: string;
  cautions: string[];
  happyPoints: string[];
  disappointPoints: string[];
  timingAdvice: string;
}

const GENDERS = ["女性", "男性", "その他"] as const;

const CATEGORY_CONFIG: Record<Category, {
  deepReadLabel: string;
  cautionsLabel: string;
  happyLabel: string;
  disappointLabel: string;
}> = {
  恋愛: {
    deepReadLabel: "🌙 2人の関係の深読み",
    cautionsLabel: "⚠️ 気を付けるべき点",
    happyLabel: "😊 相手が喜ぶポイント",
    disappointLabel: "💔 相手が幻滅するポイント",
  },
  結婚: {
    deepReadLabel: "🌙 結婚生活の深読み",
    cautionsLabel: "⚠️ 結婚生活で注意すべき点",
    happyLabel: "😊 結婚生活で幸せになれる場面",
    disappointLabel: "💔 結婚生活で摩擦が生まれやすい場面",
  },
  仕事: {
    deepReadLabel: "🌙 仕事上の相性の深読み",
    cautionsLabel: "⚠️ 仕事上で注意すべき点",
    happyLabel: "😊 仕事でうまく協力できる場面",
    disappointLabel: "💔 仕事上でぶつかりやすい点",
  },
  SEX: {
    deepReadLabel: "🌙 2人の深い相性の読み解き",
    cautionsLabel: "⚠️ 気を付けるべき点",
    happyLabel: "😊 相性が高まる場面",
    disappointLabel: "💔 注意が必要な相性の違い",
  },
};

interface FormState {
  name1: string;
  birth1: string;
  blood1: string;
  gender1: string;
  name2: string;
  birth2: string;
  blood2: string;
  gender2: string;
  category: Category;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "from-pink-400 to-rose-500" :
    score >= 60 ? "from-orange-400 to-pink-500" :
    score >= 40 ? "from-yellow-400 to-orange-400" :
    "from-gray-300 to-gray-400";
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function FortuneCard({ fortune }: { fortune: FortuneScore }) {
  const [open, setOpen] = useState(false);
  const scoreColor =
    fortune.score >= 80 ? "text-pink-600" :
    fortune.score >= 60 ? "text-orange-500" :
    fortune.score >= 40 ? "text-yellow-600" :
    "text-gray-500";

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="text-xl">{fortune.emoji}</span>
        <span className="font-bold text-gray-700 flex-1 text-left text-sm">{fortune.name}</span>
        <span className={`font-black text-lg ${scoreColor}`}>{fortune.score}<span className="text-xs font-normal text-gray-400">点</span></span>
        <div className="w-20">
          <ScoreBar score={fortune.score} />
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 bg-gradient-to-br from-pink-50/50 to-purple-50/50">
          <div className="flex gap-2 items-start">
            <span className="text-green-500 text-xs font-bold mt-0.5 flex-shrink-0">✓ 合う点</span>
            <p className="text-xs text-gray-600 leading-relaxed">{fortune.compatible}</p>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-orange-400 text-xs font-bold mt-0.5 flex-shrink-0">△ 注意点</span>
            <p className="text-xs text-gray-600 leading-relaxed">{fortune.incompatible}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [form, setForm] = useState<FormState>({
    name1: "", birth1: "2000-01-01", blood1: "A", gender1: "女性",
    name2: "", birth2: "2000-01-01", blood2: "A", gender2: "男性",
    category: "恋愛",
  });
  const [step, setStep] = useState<"form" | "result">("form");
  const [result, setResult] = useState<FortuneResult | null>(null);
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
      setResult(data);
      setStep("result");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const score = result?.score ?? result?.totalScore ?? 0;
  const catConfig = CATEGORY_CONFIG[form.category];
  const shareText = `💕 ${form.name1}×${form.name2}の${form.category}相性は${score}点！\n${result?.oneliner ?? ""}\nAIが8占術で本気診断しました✨`;

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
            <div>
              <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-1">
                <Heart size={16} className="text-pink-500 fill-pink-500" /> あなた
              </h2>
              <div className="space-y-3">
                <input type="text" placeholder="名前 *" value={form.name1}
                  onChange={e => update("name1", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-300 text-gray-900" />
                <div className="flex gap-2">
                  <select value={form.gender1} onChange={e => update("gender1", e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-300 text-gray-900 bg-white">
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select value={form.blood1} onChange={e => update("blood1", e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-300 text-gray-900 bg-white">
                    {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}型</option>)}
                  </select>
                </div>
                <input type="date" value={form.birth1}
                  onChange={e => update("birth1", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-300 text-gray-900" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-2xl">💞</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div>
              <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-1">
                <Heart size={16} className="text-purple-500 fill-purple-500" /> 相手
              </h2>
              <div className="space-y-3">
                <input type="text" placeholder="名前 *" value={form.name2}
                  onChange={e => update("name2", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900" />
                <div className="flex gap-2">
                  <select value={form.gender2} onChange={e => update("gender2", e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900 bg-white">
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select value={form.blood2} onChange={e => update("blood2", e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900 bg-white">
                    {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}型</option>)}
                  </select>
                </div>
                <input type="date" value={form.birth2}
                  onChange={e => update("birth2", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900" />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <p className="text-xs text-gray-400 text-center">
              ※ テスト版のため現在無料。正式版はPay.jpで300円の決済が入ります。
            </p>

            <button onClick={handleFortune} disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-5 rounded-2xl text-xl font-black hover:opacity-90 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <><Loader2 size={22} className="animate-spin" />占い中（約20秒）...</>
              ) : (
                <>🔮 {form.category}相性を今すぐ診断する（300円）</>
              )}
            </button>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            {/* 総合スコアカード */}
            <div className="bg-white rounded-3xl shadow-xl p-6">
              <p className="text-gray-500 text-sm text-center mb-1">{form.name1} × {form.name2} の{form.category}相性</p>
              <div className="text-center">
                <div className="text-7xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                  {score}<span className="text-4xl">点</span>
                </div>
                <p className="mt-2 font-bold text-gray-700 text-base">{result.oneliner}</p>
              </div>
              <div className="mt-4 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full transition-all duration-700"
                  style={{ width: `${score}%` }} />
              </div>
            </div>

            {/* 8占術 ふたりの特徴 左右比較 */}
            <div className="bg-white rounded-3xl shadow-xl p-5">
              <h3 className="font-black text-gray-700 mb-4 text-sm">🔍 8占術で見るふたりの特徴</h3>
              {/* 名前ヘッダー */}
              <div className="flex items-center mb-3">
                <div className="flex-1 flex items-center gap-1">
                  <span className="text-base">👤</span>
                  <span className="text-xs font-black text-pink-500 truncate">{form.name1}</span>
                </div>
                <div className="w-8 flex-shrink-0" />
                <div className="flex-1 flex items-center justify-end gap-1">
                  <span className="text-xs font-black text-purple-500 truncate">{form.name2}</span>
                  <span className="text-base">👤</span>
                </div>
              </div>
              <div className="space-y-3">
                {result.fortunes?.map((f, i) => (
                  <div key={i}>
                    <div className="text-center text-xs font-bold text-gray-400 mb-1.5">
                      {f.emoji} {f.name}
                    </div>
                    <div className="flex gap-2 items-stretch">
                      <div className="flex-1 bg-pink-50 border border-pink-100 rounded-2xl px-3 py-2 text-xs text-gray-700 leading-relaxed text-center">
                        {f.person1Trait ?? "—"}
                      </div>
                      <div className="flex items-center justify-center flex-shrink-0 w-5">
                        <span className="text-gray-300 text-xs">⟷</span>
                      </div>
                      <div className="flex-1 bg-purple-50 border border-purple-100 rounded-2xl px-3 py-2 text-xs text-gray-700 leading-relaxed text-center">
                        {f.person2Trait ?? "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 8占術スコア一覧 */}
            <div className="bg-white rounded-3xl shadow-xl p-5">
              <h3 className="font-black text-gray-700 mb-3 text-sm flex items-center gap-2">
                🔮 8占術の個別スコア
                <span className="text-xs font-normal text-gray-400">▼ タップで詳細表示</span>
              </h3>
              <div className="space-y-2">
                {result.fortunes?.map((f, i) => (
                  <FortuneCard key={i} fortune={f} />
                ))}
              </div>
            </div>

            {/* 深読み */}
            <div className="bg-white rounded-3xl shadow-xl p-5">
              <h3 className="font-black text-gray-700 mb-3 text-sm">{catConfig.deepReadLabel}</h3>
              <p className="text-sm text-gray-600 leading-relaxed bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-4">
                {result.deepRead}
              </p>
            </div>

            {/* 気を付ける点・喜ぶ・幻滅 */}
            <div className="bg-white rounded-3xl shadow-xl p-5 space-y-5">

              <div>
                <h3 className="font-black text-gray-700 mb-3 text-sm flex items-center gap-1">
                  {catConfig.cautionsLabel}
                </h3>
                <div className="space-y-2">
                  {result.cautions?.map((c, i) => (
                    <div key={i} className="flex gap-2 items-start bg-orange-50 rounded-xl px-3 py-2">
                      <span className="text-orange-400 font-bold text-xs flex-shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-xs text-gray-700 leading-relaxed">{c}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-black text-gray-700 mb-3 text-sm flex items-center gap-1">
                  {catConfig.happyLabel}
                </h3>
                <div className="space-y-2">
                  {result.happyPoints?.map((h, i) => (
                    <div key={i} className="flex gap-2 items-start bg-green-50 rounded-xl px-3 py-2">
                      <span className="text-green-500 font-bold text-xs flex-shrink-0 mt-0.5">✓</span>
                      <p className="text-xs text-gray-700 leading-relaxed">{h}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-black text-gray-700 mb-3 text-sm flex items-center gap-1">
                  {catConfig.disappointLabel}
                </h3>
                <div className="space-y-2">
                  {result.disappointPoints?.map((d, i) => (
                    <div key={i} className="flex gap-2 items-start bg-red-50 rounded-xl px-3 py-2">
                      <span className="text-red-400 font-bold text-xs flex-shrink-0 mt-0.5">✕</span>
                      <p className="text-xs text-gray-700 leading-relaxed">{d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* タイミング */}
            {result.timingAdvice && (
              <div className="bg-white rounded-3xl shadow-xl p-5">
                <h3 className="font-black text-gray-700 mb-2 text-sm">⏰ 重要なタイミング</h3>
                <p className="text-xs text-gray-600 leading-relaxed bg-indigo-50 rounded-xl p-3">{result.timingAdvice}</p>
              </div>
            )}

            {/* シェアボタン */}
            <div className="bg-white rounded-3xl shadow-xl p-5">
              <div className="flex gap-3">
                <button
                  onClick={() => window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank")}
                  className="flex-1 bg-black text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm hover:opacity-80">
                  <Share2 size={16} />Xでシェア
                </button>
                <button
                  onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`, "_blank")}
                  className="flex-1 bg-green-500 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm hover:opacity-80">
                  LINEで送る
                </button>
              </div>
              <button
                onClick={() => { setStep("form"); setResult(null); }}
                className="w-full mt-3 border border-gray-200 text-gray-600 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm hover:bg-gray-50">
                <RotateCcw size={16} />別の組み合わせを占う
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          占い結果はエンターテインメントです。参考程度にお楽しみください。
        </p>
      </div>
    </main>
  );
}
