import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name1    = searchParams.get("name1")    || "？";
  const name2    = searchParams.get("name2")    || "？";
  const score    = searchParams.get("score")    || "0";
  const category = searchParams.get("category") || "恋愛";
  const oneliner = searchParams.get("oneliner") || "";

  const scoreNum = parseInt(score, 10);
  const barColor = scoreNum >= 80 ? "#ec4899" : scoreNum >= 60 ? "#f97316" : scoreNum >= 40 ? "#eab308" : "#9ca3af";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fdf2f8 0%, #f5f3ff 50%, #eef2ff 100%)",
          fontFamily: "sans-serif",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* 背景装飾 */}
        <div style={{
          position: "absolute", top: 40, right: 60,
          fontSize: 120, opacity: 0.12,
        }}>🔮</div>
        <div style={{
          position: "absolute", bottom: 40, left: 60,
          fontSize: 80, opacity: 0.1,
        }}>✨</div>

        {/* アプリ名 */}
        <div style={{
          fontSize: 28, fontWeight: 700,
          background: "linear-gradient(90deg, #ec4899, #9333ea)",
          backgroundClip: "text",
          color: "transparent",
          marginBottom: 20,
          letterSpacing: "0.05em",
        }}>
          🔮 AI相性占い
        </div>

        {/* カテゴリバッジ */}
        <div style={{
          background: "linear-gradient(90deg, #ec4899, #9333ea)",
          color: "white",
          borderRadius: 30,
          padding: "6px 24px",
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 30,
        }}>
          {category}相性診断
        </div>

        {/* 名前 */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 30,
        }}>
          <div style={{
            background: "white",
            borderRadius: 20,
            padding: "12px 28px",
            fontSize: 36,
            fontWeight: 900,
            color: "#db2777",
            boxShadow: "0 4px 20px rgba(236,72,153,0.2)",
          }}>{name1}</div>
          <div style={{ fontSize: 32, color: "#9ca3af" }}>×</div>
          <div style={{
            background: "white",
            borderRadius: 20,
            padding: "12px 28px",
            fontSize: 36,
            fontWeight: 900,
            color: "#9333ea",
            boxShadow: "0 4px 20px rgba(147,51,234,0.2)",
          }}>{name2}</div>
        </div>

        {/* スコア */}
        <div style={{
          fontSize: 130,
          fontWeight: 900,
          lineHeight: 1,
          background: `linear-gradient(90deg, #ec4899, #9333ea)`,
          backgroundClip: "text",
          color: "transparent",
        }}>
          {score}
          <span style={{ fontSize: 54, color: "#6b7280", background: "none" }}>点</span>
        </div>

        {/* スコアバー */}
        <div style={{
          width: 500, height: 16,
          background: "#e5e7eb",
          borderRadius: 999,
          marginTop: 20,
          overflow: "hidden",
        }}>
          <div style={{
            width: `${scoreNum}%`,
            height: "100%",
            background: `linear-gradient(90deg, #f472b6, ${barColor})`,
            borderRadius: 999,
          }} />
        </div>

        {/* ワンライナー */}
        {oneliner && (
          <div style={{
            marginTop: 24,
            fontSize: 22,
            color: "#4b5563",
            fontWeight: 600,
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.5,
          }}>{oneliner}</div>
        )}

        {/* フッター */}
        <div style={{
          position: "absolute",
          bottom: 30,
          fontSize: 18,
          color: "#9ca3af",
        }}>
          Claude AIが8占術で本気診断
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
