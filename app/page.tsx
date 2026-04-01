"use client";

import { useState, useEffect } from "react";
import { Heart, Share2, RotateCcw, ChevronDown, ChevronUp, History, X } from "lucide-react";
import { saveFortuneResult, getRecentResults, type FortuneRecord } from "@/lib/supabase";

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

// ────────────────────────────────────────────
// 生年月日セレクター（年・月・日を同時に選択）
// ────────────────────────────────────────────
function DatePicker({ value, onChange, ringColor }: {
  value: string;
  onChange: (v: string) => void;
  ringColor: string;
}) {
  const parts = value ? value.split("-") : ["2000", "01", "01"];
  const year  = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day   = parseInt(parts[2], 10);

  const years  = Array.from({ length: 91 }, (_, i) => 2010 - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days   = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const emit = (y: number, m: number, d: number) => {
    const maxD = new Date(y, m, 0).getDate();
    const clampedD = Math.min(d, maxD);
    onChange(`${y}-${String(m).padStart(2, "0")}-${String(clampedD).padStart(2, "0")}`);
  };

  const selectClass = `border border-gray-200 rounded-xl px-2 py-3 focus:outline-none focus:ring-2 ${ringColor} text-gray-900 bg-white text-sm appearance-none`;

  return (
    <div className="flex gap-1.5">
      <div className="flex-1 relative">
        <select value={year} onChange={e => emit(Number(e.target.value), month, day)}
          className={`w-full ${selectClass} pr-1`}>
          {years.map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
      </div>
      <div className="relative" style={{ width: "72px" }}>
        <select value={month} onChange={e => emit(year, Number(e.target.value), day)}
          className={`w-full ${selectClass} pr-1`}>
          {months.map(m => <option key={m} value={m}>{m}月</option>)}
        </select>
      </div>
      <div className="relative" style={{ width: "72px" }}>
        <select value={day} onChange={e => emit(year, month, Number(e.target.value))}
          className={`w-full ${selectClass} pr-1`}>
          {days.map(d => <option key={d} value={d}>{d}日</option>)}
        </select>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// 水晶玉ローディングオーバーレイ
// ────────────────────────────────────────────
function CrystalBallLoader() {
  return (
    <>
      <style>{`
        @keyframes cb-glow {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(168,85,247,0.7)) drop-shadow(0 0 24px rgba(236,72,153,0.4)); }
          50%       { filter: drop-shadow(0 0 28px rgba(236,72,153,1))   drop-shadow(0 0 48px rgba(168,85,247,0.6)); }
        }
        @keyframes cb-shimmer {
          0%, 100% { opacity: 0.25; }
          50%       { opacity: 0.65; }
        }
        @keyframes cb-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes cb-wave {
          0%   { transform: rotate(-25deg) translateX(-8px); }
          50%  { transform: rotate(15deg)  translateX(8px);  }
          100% { transform: rotate(-25deg) translateX(-8px); }
        }
      `}</style>
      <div style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "linear-gradient(135deg,rgba(88,28,135,0.92),rgba(157,23,77,0.88),rgba(55,48,163,0.92))",
        backdropFilter: "blur(4px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ position: "relative", width: 180, height: 230 }}>
          <div style={{
            position: "absolute", top: 0, left: "50%",
            transform: "translateX(-50%)",
            animation: "cb-wave 1.8s ease-in-out infinite",
            transformOrigin: "bottom center",
            fontSize: 64, lineHeight: 1, userSelect: "none",
          }}>🤲</div>
          <div style={{
            position: "absolute", bottom: 0, left: "50%",
            transform: "translateX(-50%)",
            animation: "cb-float 3s ease-in-out infinite",
          }}>
            <svg width="160" height="170" viewBox="0 0 160 170" style={{ animation: "cb-glow 2.2s ease-in-out infinite" }}>
              <defs>
                <radialGradient id="ballGrad" cx="35%" cy="28%" r="68%">
                  <stop offset="0%"   stopColor="#f5d0fe" stopOpacity="0.95" />
                  <stop offset="35%"  stopColor="#c084fc" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#3b0764" stopOpacity="0.98" />
                </radialGradient>
                <radialGradient id="fogGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor="#f0abfc" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                </radialGradient>
              </defs>
              <ellipse cx="80" cy="158" rx="38" ry="9"  fill="#2e1065" opacity="0.7" />
              <rect    x="62"  y="148" width="36" height="12" fill="#3b0764" rx="4" />
              <circle cx="80" cy="75" r="68" fill="url(#ballGrad)" />
              <circle cx="80" cy="75" r="52" fill="url(#fogGrad)"
                style={{ animation: "cb-shimmer 2s ease-in-out infinite" }} />
              <ellipse cx="58" cy="48" rx="20" ry="13" fill="white" opacity="0.38" />
              <ellipse cx="52" cy="42" rx="9"  ry="6"  fill="white" opacity="0.55" />
            </svg>
          </div>
        </div>
        <p style={{ color: "white", fontWeight: "900", fontSize: 20, marginTop: 24 }}>占い中…</p>
        <p style={{ color: "#d8b4fe", fontSize: 13, marginTop: 6 }}>8占術で本気診断中（約20秒）</p>
      </div>
    </>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "from-pink-400 to-rose-500" :
    score >= 60 ? "from-orange-400 to-pink-500" :
    score >= 40 ? "from-yellow-400 to-orange-400" :
    "from-gray-300 to-gray-400";
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
        style={{ width: `${score}%` }} />
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
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        style={{ WebkitTapHighlightColor: "transparent" }}>
        <span className="text-xl flex-shrink-0">{fortune.emoji}</span>
        <span className="font-bold text-gray-700 flex-1 text-left text-sm leading-tight">{fortune.name}</span>
        <span className={`font-black text-lg ${scoreColor} flex-shrink-0`}>
          {fortune.score}<span className="text-xs font-normal text-gray-400">点</span>
        </span>
        <div className="w-16 flex-shrink-0">
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

// ────────────────────────────────────────────
// フォームセクション共通コンポーネント
// ────────────────────────────────────────────
function PersonSection({
  title, icon, color, ringColor,
  name, onName,
  gender, onGender,
  blood, onBlood,
  birth, onBirth,
}: {
  title: string; icon: React.ReactNode; color: string; ringColor: string;
  name: string; onName: (v: string) => void;
  gender: string; onGender: (v: string) => void;
  blood: string; onBlood: (v: string) => void;
  birth: string; onBirth: (v: string) => void;
}) {
  const selectBase = `border border-gray-200 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 ${ringColor} text-gray-900 bg-white text-sm w-full`;
  return (
    <div>
      <h2 className={`font-bold ${color} mb-3 flex items-center gap-1.5 text-sm`}>
        {icon}{title}
      </h2>
      <div className="space-y-2.5">
        <input type="text" placeholder="名前 *" value={name}
          onChange={e => onName(e.target.value)}
          className={`w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 ${ringColor} text-gray-900 text-base`}
          style={{ fontSize: 16 /* iOSズームイン防止 */ }} />
        <div className="grid grid-cols-2 gap-2">
          <select value={gender} onChange={e => onGender(e.target.value)} className={selectBase}>
            {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={blood} onChange={e => onBlood(e.target.value)} className={selectBase}>
            {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}型</option>)}
          </select>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5 pl-1">生年月日</p>
          <DatePicker value={birth} onChange={onBirth} ringColor={ringColor} />
        </div>
      </div>
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
  const [history, setHistory] = useState<FortuneRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // 履歴を取得
  useEffect(() => {
    getRecentResults(20).then(setHistory).catch(() => {/* Supabase未設定時は無視 */});
  }, []);

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
      // Supabaseに保存（失敗しても続行）
      saveFortuneResult({
        name1: form.name1, birth1: form.birth1, gender1: form.gender1, blood1: form.blood1,
        name2: form.name2, birth2: form.birth2, gender2: form.gender2, blood2: form.blood2,
        category: form.category,
        score: data.score ?? data.totalScore ?? 0,
        oneliner: data.oneliner ?? "",
        result_json: JSON.stringify(data),
      }).then(() => getRecentResults(20).then(setHistory)).catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const score = result?.score ?? result?.totalScore ?? 0;
  const catConfig = CATEGORY_CONFIG[form.category];

  // OGページへのURL（SNSシェア用）
  const ogPageUrl = typeof window !== "undefined"
    ? `${window.location.origin}/og?name1=${encodeURIComponent(form.name1)}&name2=${encodeURIComponent(form.name2)}&score=${score}&category=${encodeURIComponent(form.category)}&oneliner=${encodeURIComponent(result?.oneliner ?? "")}`
    : "";
  const shareText = `💕 ${form.name1}×${form.name2}の${form.category}相性は${score}点！\n${result?.oneliner ?? ""}\n✨AIが8占術で本気診断`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-start justify-center p-3 sm:p-4 sm:items-center">
      {loading && <CrystalBallLoader />}

      {/* 履歴モーダル */}
      {showHistory && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowHistory(false)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-black text-gray-700 text-base flex items-center gap-2">
                <History size={16} className="text-pink-500" />診断履歴
              </h2>
              <button onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {history.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">まだ診断履歴がありません</p>
              ) : (
                history.map(r => (
                  <div key={r.id}
                    className="border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      const parsed = JSON.parse(r.result_json);
                      setForm(f => ({
                        ...f,
                        name1: r.name1, birth1: r.birth1, gender1: r.gender1, blood1: r.blood1,
                        name2: r.name2, birth2: r.birth2, gender2: r.gender2, blood2: r.blood2,
                        category: r.category as Category,
                      }));
                      setResult(parsed);
                      setStep("result");
                      setShowHistory(false);
                    }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-700 truncate">
                        {r.name1} × {r.name2}
                        <span className="ml-2 text-xs font-normal text-gray-400">{r.category}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString("ja-JP") : ""}
                      </p>
                    </div>
                    <div className="text-lg font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent flex-shrink-0">
                      {r.score}点
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg w-full py-4">
        {/* ヘッダー */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-end mb-1">
            {history.length > 0 && (
              <button onClick={() => setShowHistory(true)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-pink-500 transition-colors px-2 py-1">
                <History size={13} />履歴（{history.length}件）
              </button>
            )}
          </div>
          <div className="text-5xl mb-2">🔮</div>
          <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            超！相性診断
          </h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm">Claude AIが8占術で本気診断｜1回500円</p>
          {/* カテゴリ表示 */}
          <div className="flex gap-1.5 justify-center mt-3 flex-wrap">
            {CATEGORIES.map(c => {
              const label = c === "恋愛" ? "💕 恋愛" : c === "結婚" ? "💍 結婚" : c === "仕事" ? "💼 仕事" : "🔥 SEX";
              const isSelected = form.category === c;
              const isResult = step === "result";
              // 結果画面では選択外を非表示
              if (isResult && !isSelected) return null;
              return (
                <button key={c}
                  onClick={() => !isResult && update("category", c)}
                  style={{ WebkitTapHighlightColor: "transparent", cursor: isResult ? "default" : "pointer" }}
                  className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                    isSelected
                      ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                      : "bg-white text-gray-400 border border-gray-200"
                  } ${!isResult ? "hover:border-pink-300" : ""}`}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {step === "form" && (
          <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-6 space-y-5">
            <PersonSection
              title="あなた" color="text-gray-700" ringColor="focus:ring-pink-300"
              icon={<Heart size={15} className="text-pink-500 fill-pink-500" />}
              name={form.name1} onName={v => update("name1", v)}
              gender={form.gender1} onGender={v => update("gender1", v)}
              blood={form.blood1} onBlood={v => update("blood1", v)}
              birth={form.birth1} onBirth={v => update("birth1", v)}
            />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-2xl">💞</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <PersonSection
              title="相手" color="text-gray-700" ringColor="focus:ring-purple-300"
              icon={<Heart size={15} className="text-purple-500 fill-purple-500" />}
              name={form.name2} onName={v => update("name2", v)}
              gender={form.gender2} onGender={v => update("gender2", v)}
              blood={form.blood2} onBlood={v => update("blood2", v)}
              birth={form.birth2} onBirth={v => update("birth2", v)}
            />

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <p className="text-xs text-gray-400 text-center">
              ※ テスト版のため現在無料。正式版はPay.jpで500円の決済が入ります。
            </p>

            <button type="button" onClick={handleFortune} disabled={loading}
              style={{ WebkitTapHighlightColor: "transparent", fontSize: 18 }}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 sm:py-5 rounded-2xl font-black hover:opacity-90 active:scale-95 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
              🔮 {form.category}相性を今すぐ診断する（500円）
            </button>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-3 sm:space-y-4">
            {/* 総合スコアカード */}
            <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-6">
              <p className="text-gray-500 text-xs sm:text-sm text-center mb-1">
                {form.name1} × {form.name2} の{form.category}相性
              </p>
              <div className="text-center">
                <div className="text-6xl sm:text-7xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                  {score}<span className="text-3xl sm:text-4xl">点</span>
                </div>
                <p className="mt-2 font-bold text-gray-700 text-sm sm:text-base leading-snug">{result.oneliner}</p>
              </div>
              <div className="mt-4 h-3 sm:h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full transition-all duration-700"
                  style={{ width: `${score}%` }} />
              </div>
            </div>

            {/* 8占術 ふたりの特徴 左右比較 */}
            <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-5">
              <h3 className="font-black text-gray-700 mb-3 text-sm">🔍 8占術で見るふたりの特徴</h3>
              <div className="flex items-center mb-3">
                <div className="flex-1 flex items-center gap-1 min-w-0">
                  <span className="text-base flex-shrink-0">👤</span>
                  <span className="text-xs font-black text-pink-500 truncate">{form.name1}</span>
                </div>
                <div className="w-6 flex-shrink-0" />
                <div className="flex-1 flex items-center justify-end gap-1 min-w-0">
                  <span className="text-xs font-black text-purple-500 truncate">{form.name2}</span>
                  <span className="text-base flex-shrink-0">👤</span>
                </div>
              </div>
              <div className="space-y-3">
                {result.fortunes?.map((f, i) => (
                  <div key={i}>
                    <div className="text-center text-xs font-bold text-gray-400 mb-1.5">
                      {f.emoji} {f.name}
                    </div>
                    <div className="flex gap-1.5 items-stretch">
                      <div className="flex-1 bg-pink-50 border border-pink-100 rounded-2xl px-2.5 py-2 text-xs text-gray-700 leading-relaxed text-center">
                        {f.person1Trait ?? "—"}
                      </div>
                      <div className="flex items-center justify-center flex-shrink-0 w-4">
                        <span className="text-gray-300 text-xs">⟷</span>
                      </div>
                      <div className="flex-1 bg-purple-50 border border-purple-100 rounded-2xl px-2.5 py-2 text-xs text-gray-700 leading-relaxed text-center">
                        {f.person2Trait ?? "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 8占術スコア一覧 */}
            <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-5">
              <h3 className="font-black text-gray-700 mb-3 text-sm flex items-center gap-2">
                🔮 8占術の個別スコア
                <span className="text-xs font-normal text-gray-400">▼ タップで詳細</span>
              </h3>
              <div className="space-y-2">
                {result.fortunes?.map((f, i) => <FortuneCard key={i} fortune={f} />)}
              </div>
            </div>

            {/* 深読み */}
            <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-5">
              <h3 className="font-black text-gray-700 mb-3 text-sm">{catConfig.deepReadLabel}</h3>
              <p className="text-sm text-gray-600 leading-relaxed bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-4">
                {result.deepRead}
              </p>
            </div>

            {/* 気を付ける点・喜ぶ・幻滅 */}
            <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-5 space-y-5">
              {[
                { label: catConfig.cautionsLabel, items: result.cautions, bg: "bg-orange-50", icon: (i: number) => <span className="text-orange-400 font-bold text-xs flex-shrink-0 mt-0.5">{i + 1}</span> },
                { label: catConfig.happyLabel,    items: result.happyPoints, bg: "bg-green-50",  icon: () => <span className="text-green-500 font-bold text-xs flex-shrink-0 mt-0.5">✓</span> },
                { label: catConfig.disappointLabel, items: result.disappointPoints, bg: "bg-red-50", icon: () => <span className="text-red-400 font-bold text-xs flex-shrink-0 mt-0.5">✕</span> },
              ].map(({ label, items, bg, icon }) => (
                <div key={label}>
                  <h3 className="font-black text-gray-700 mb-2.5 text-sm">{label}</h3>
                  <div className="space-y-2">
                    {items?.map((item, i) => (
                      <div key={i} className={`flex gap-2 items-start ${bg} rounded-xl px-3 py-2`}>
                        {icon(i)}
                        <p className="text-xs text-gray-700 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* タイミング */}
            {result.timingAdvice && (
              <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-5">
                <h3 className="font-black text-gray-700 mb-2 text-sm">⏰ 重要なタイミング</h3>
                <p className="text-xs text-gray-600 leading-relaxed bg-indigo-50 rounded-xl p-3">{result.timingAdvice}</p>
              </div>
            )}

            {/* シェアボタン */}
            <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-5">
              <p className="text-xs text-gray-400 text-center mb-3">友達にシェアしよう！</p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText + "\n" + ogPageUrl)}`, "_blank")}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                  className="flex-1 bg-black text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm hover:opacity-80 active:scale-95 transition-all">
                  <Share2 size={15} />Xでシェア
                </button>
                <button
                  onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText + "\n" + ogPageUrl)}`, "_blank")}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                  className="flex-1 bg-green-500 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm hover:opacity-80 active:scale-95 transition-all">
                  LINEで送る
                </button>
              </div>
              <button
                onClick={() => { setStep("form"); setResult(null); }}
                style={{ WebkitTapHighlightColor: "transparent" }}
                className="w-full mt-2.5 border border-gray-200 text-gray-600 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm hover:bg-gray-50 active:scale-95 transition-all">
                <RotateCcw size={15} />別の組み合わせを占う
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-5">
          占い結果はエンターテインメントです。参考程度にお楽しみください。
        </p>
      </div>
    </main>
  );
}
