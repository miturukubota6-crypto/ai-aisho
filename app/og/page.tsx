import { Metadata } from "next";

interface Props {
  searchParams: Promise<{
    name1?: string;
    name2?: string;
    score?: string;
    category?: string;
    oneliner?: string;
  }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const name1    = params.name1    || "？";
  const name2    = params.name2    || "？";
  const score    = params.score    || "0";
  const category = params.category || "恋愛";
  const oneliner = params.oneliner || "";

  const title = `${name1}×${name2}の${category}相性は${score}点！`;
  const description = oneliner || `AIが8占術で${name1}と${name2}の${category}相性を本気診断しました。`;

  const ogImageUrl = `/api/og?name1=${encodeURIComponent(name1)}&name2=${encodeURIComponent(name2)}&score=${score}&category=${encodeURIComponent(category)}&oneliner=${encodeURIComponent(oneliner)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function OgPage({ searchParams }: Props) {
  const params = await searchParams;
  const name1    = params.name1    || "？";
  const name2    = params.name2    || "？";
  const score    = params.score    || "0";
  const category = params.category || "恋愛";
  const oneliner = params.oneliner || "";
  const scoreNum = parseInt(score, 10);

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="text-5xl mb-3">🔮</div>
        <h1 className="text-3xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
          超！相性診断
        </h1>
        <p className="text-gray-500 text-sm mb-6">Claude AIが8占術で本気診断</p>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <p className="text-gray-500 text-sm mb-2">{name1} × {name2} の{category}相性</p>
          <div className="text-7xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {score}<span className="text-4xl">点</span>
          </div>
          {oneliner && (
            <p className="mt-3 font-bold text-gray-700 text-base leading-snug">{oneliner}</p>
          )}
          <div className="mt-5 h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full"
              style={{ width: `${scoreNum}%` }}
            />
          </div>
        </div>

        <a href="/"
          className="mt-6 inline-block bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:opacity-90 transition-all shadow-lg">
          🔮 自分も占ってみる
        </a>

        <p className="text-center text-xs text-gray-400 mt-6">
          占い結果はエンターテインメントです。参考程度にお楽しみください。
        </p>
      </div>
    </main>
  );
}
