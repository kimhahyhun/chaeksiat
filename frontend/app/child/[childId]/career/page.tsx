"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { booksApi, careerApi, CareerAnalysis, CareerRecommendation, ReadingRecord } from "@/lib/api";

const COLOR_MAP: Record<string, { bg: string; border: string; accent: string; progress: string; badge: string; tag: string }> = {
  amber:   { bg: "bg-amber-50",   border: "border-amber-300",  accent: "bg-amber-100",   progress: "bg-amber-500",   badge: "bg-amber-500",   tag: "text-amber-700" },
  blue:    { bg: "bg-blue-50",    border: "border-blue-300",   accent: "bg-blue-100",    progress: "bg-blue-500",    badge: "bg-blue-500",    tag: "text-blue-700" },
  pink:    { bg: "bg-pink-50",    border: "border-pink-300",   accent: "bg-pink-100",    progress: "bg-pink-500",    badge: "bg-pink-500",    tag: "text-pink-700" },
  rose:    { bg: "bg-rose-50",    border: "border-rose-300",   accent: "bg-rose-100",    progress: "bg-rose-500",    badge: "bg-rose-500",    tag: "text-rose-700" },
  purple:  { bg: "bg-purple-50",  border: "border-purple-300", accent: "bg-purple-100",  progress: "bg-purple-500",  badge: "bg-purple-500",  tag: "text-purple-700" },
  orange:  { bg: "bg-orange-50",  border: "border-orange-300", accent: "bg-orange-100",  progress: "bg-orange-500",  badge: "bg-orange-500",  tag: "text-orange-700" },
  cyan:    { bg: "bg-cyan-50",    border: "border-cyan-300",   accent: "bg-cyan-100",    progress: "bg-cyan-500",    badge: "bg-cyan-500",    tag: "text-cyan-700" },
  fuchsia: { bg: "bg-fuchsia-50", border: "border-fuchsia-300",accent: "bg-fuchsia-100", progress: "bg-fuchsia-500", badge: "bg-fuchsia-500", tag: "text-fuchsia-700" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-300",accent: "bg-emerald-100", progress: "bg-emerald-500", badge: "bg-emerald-500", tag: "text-emerald-700" },
  green:   { bg: "bg-green-50",   border: "border-green-300",  accent: "bg-green-100",   progress: "bg-green-500",   badge: "bg-green-500",   tag: "text-green-700" },
};

function CareerCard({ career, isTop }: { career: CareerRecommendation; isTop: boolean }) {
  const c = COLOR_MAP[career.color] ?? COLOR_MAP.blue;
  return (
    <div className={`rounded-3xl border-2 p-6 ${c.bg} ${isTop ? `${c.border} shadow-lg` : "border-gray-200"}`}>
      {isTop && (
        <div className={`inline-block text-xs font-bold text-white px-3 py-1 rounded-full mb-3 ${c.badge}`}>
          ✨ 가장 잘 어울려요!
        </div>
      )}
      <div className="flex items-start gap-3 mb-4">
        <span className="text-4xl">{career.emoji}</span>
        <div>
          <p className="text-xs text-gray-400 font-medium">{career.rank}순위</p>
          <h3 className="text-xl font-black text-gray-800">{career.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{career.desc}</p>
        </div>
      </div>

      {/* 매칭도 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm font-bold text-gray-700 mb-1">
          <span>매칭도</span>
          <span className={c.tag}>{career.match_rate}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${c.progress}`}
            style={{ width: `${career.match_rate}%` }}
          />
        </div>
      </div>

      {/* 추천 이유 */}
      <div className={`rounded-2xl p-3 mb-4 ${c.accent}`}>
        <p className="text-xs font-bold text-gray-600 mb-1">💡 추천 이유</p>
        <p className="text-sm text-gray-700 leading-relaxed">{career.reason}</p>
      </div>

      {/* 추천 도서 */}
      <div className="mb-3">
        <p className="text-xs font-bold text-gray-500 mb-2">📖 추천 도서</p>
        <ul className="space-y-1">
          {career.recommended_books.map((book) => (
            <li key={book} className="text-sm text-gray-600 flex items-center gap-1">
              <span className="text-gray-300">•</span> {book}
            </li>
          ))}
        </ul>
      </div>

      {/* 체험 활동 */}
      <div>
        <p className="text-xs font-bold text-gray-500 mb-2">🎯 체험 활동</p>
        <div className="flex flex-wrap gap-2">
          {career.activities.map((act) => (
            <span key={act} className={`text-xs font-medium px-2 py-1 rounded-full ${c.accent} ${c.tag}`}>
              ❤️ {act}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CareerPage() {
  const params = useParams();
  const router = useRouter();
  const childId = Number(params.childId);

  const [phase, setPhase] = useState<"loading" | "ready" | "analyzing" | "results">("loading");
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [careerData, setCareerData] = useState<CareerAnalysis | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    booksApi.listRecords(childId)
      .then((r) => { setRecords(r); setPhase("ready"); })
      .catch(() => { setError("독서 기록을 불러올 수 없어요."); setPhase("ready"); });
  }, [childId]);

  const handleAnalyze = async () => {
    setPhase("analyzing");
    try {
      const data = await careerApi.getRecommendations(childId);
      setCareerData(data);
      // 잠깐의 분석 연출
      await new Promise((r) => setTimeout(r, 1500));
      setPhase("results");
    } catch {
      setError("분석 중 오류가 발생했어요. 다시 시도해주세요.");
      setPhase("ready");
    }
  };

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-seed-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl animate-bounce mb-3">🔭</div>
          <p className="text-gray-500 text-sm">독서 기록 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const totalBooks = records.length;
  const uniqueCategories = careerData?.unique_categories ?? new Set(records.map((r) => r.book.class_nm).filter(Boolean)).size;
  const childName = careerData?.child_name ?? "나";

  // 분석 완료율 계산 (백엔드와 동일 로직)
  let analysisPct = 0;
  if (totalBooks === 0) analysisPct = 0;
  else if (totalBooks < 3) analysisPct = 30 + totalBooks * 10;
  else if (totalBooks < 5) analysisPct = 60 + totalBooks * 5;
  else analysisPct = Math.min(85 + totalBooks, 99);

  // ── 분석 로딩 화면 ──
  if (phase === "analyzing") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-7xl mb-6 animate-spin" style={{ animationDuration: "3s" }}>🔮</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">AI가 분석 중이에요!</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            읽은 책들을 바탕으로<br />나에게 어울리는 직업을 찾고 있어요...
          </p>
          <div className="mt-8 flex justify-center gap-2">
            {["🔬", "📚", "🎨", "🌿", "⚙️"].map((e, i) => (
              <span
                key={i}
                className="text-2xl opacity-0 animate-pulse"
                style={{ animationDelay: `${i * 0.3}s`, animationFillMode: "both" }}
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 결과 화면 ──
  if (phase === "results" && careerData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-lg mx-auto px-4 py-6">
          {/* 헤더 */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setPhase("ready")}
              className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-gray-500 hover:bg-gray-50"
            >
              ←
            </button>
            <h1 className="text-lg font-black text-gray-800">진로 추천 결과</h1>
          </div>

          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-2xl font-black text-gray-800">
              <span className="text-indigo-600">{childName}</span>에게<br />어울리는 직업은?
            </h2>
            <p className="text-sm text-gray-400 mt-2">읽은 책 {totalBooks}권을 분석한 결과예요</p>
          </div>

          {/* 직업 카드 */}
          <div className="space-y-5 mb-8">
            {careerData.recommendations.map((career) => (
              <CareerCard key={career.name} career={career} isTop={career.rank === 1} />
            ))}
          </div>

          {/* 안내 문구 */}
          <div className="bg-gray-50 rounded-2xl p-4 text-center mb-6">
            <p className="text-xs text-gray-400 leading-relaxed">
              ⚠️ 이 결과는 독서 패턴을 바탕으로 한 예시이며 실제 적성 진단이 아니에요.<br />
              책을 더 많이 읽을수록 더 정확해져요!
            </p>
          </div>

          <button
            onClick={() => setPhase("ready")}
            className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg shadow-lg hover:bg-indigo-700 transition-colors"
          >
            다시 분석하기
          </button>
        </div>
      </div>
    );
  }

  // ── 분석 준비 화면 ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push(`/child/${childId}`)}
            className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-gray-500 hover:bg-gray-50"
          >
            ←
          </button>
          <h1 className="text-lg font-black text-gray-800">진로 추천</h1>
        </div>

        {/* 타이틀 */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📚</div>
          <h2 className="text-2xl font-black text-gray-800 leading-tight">
            내가 좋아하는 책으로<br />
            <span className="text-indigo-600">미래 직업 찾기</span>
          </h2>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">
            지금까지 읽은 책들을 분석해서<br />
            나에게 어울리는 직업을 AI가 추천해드려요! 🤖✨
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-2xl p-3 text-sm text-center mb-4">{error}</div>
        )}

        {/* 읽은 책들 섹션 */}
        <div className="bg-white rounded-3xl shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-gray-700">📖 내가 읽은 책들</h3>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
              {totalBooks}권
            </span>
          </div>

          {totalBooks === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">📖</div>
              <p className="font-black text-gray-700 mb-1">아직 읽은 책이 없어요!</p>
              <p className="text-sm text-gray-400 leading-relaxed">
                책을 읽을수록 나에게 딱 맞는<br />직업을 찾을 수 있어요
              </p>
              <button
                onClick={() => router.push(`/child/${childId}`)}
                className="mt-4 px-5 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-700 transition-colors"
              >
                📚 책 읽으러 가기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {records.slice(0, 12).map((r) => (
                <div key={r.id} className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 relative">
                  {r.book.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.book.cover_url} alt={r.book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📕</div>
                  )}
                </div>
              ))}
              {totalBooks > 12 && (
                <div className="aspect-[3/4] rounded-xl bg-indigo-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-indigo-600">+{totalBooks - 12}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <p className="text-2xl font-black text-indigo-600">{totalBooks}</p>
            <p className="text-xs text-gray-400 mt-1">읽은 책</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <p className="text-2xl font-black text-purple-500">{uniqueCategories}</p>
            <p className="text-xs text-gray-400 mt-1">다양한 분야</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <p className="text-2xl font-black text-emerald-500">{analysisPct}%</p>
            <p className="text-xs text-gray-400 mt-1">분석 완료</p>
          </div>
        </div>

        {totalBooks === 0 ? (
          /* 0권일 때 안내 */
          <div className="bg-amber-50 rounded-3xl p-5 text-center border-2 border-amber-200">
            <div className="text-4xl mb-3">🌱</div>
            <p className="font-black text-amber-800 text-base mb-1">책을 읽고 추천받아요!</p>
            <p className="text-sm text-amber-600 leading-relaxed mb-4">
              읽은 책이 많을수록 나에게 딱 맞는<br />직업을 더 정확하게 찾을 수 있어요
            </p>
            <button
              onClick={() => router.push(`/child/${childId}`)}
              className="w-full py-3 rounded-2xl bg-amber-500 text-white font-black text-base hover:bg-amber-600 transition-colors"
            >
              📚 책 추가하러 가기
            </button>
          </div>
        ) : (
          <>
            {/* 분석 준비 완료 */}
            <div className="bg-indigo-50 rounded-3xl p-5 mb-5 text-center">
              <div className="text-3xl mb-2">🤖</div>
              <p className="font-black text-indigo-800 text-base">AI 진로 분석 준비 완료!</p>
              <p className="text-xs text-indigo-500 mt-1">읽은 책들을 바탕으로 어울리는 직업을 찾아드릴게요</p>
            </div>
            <button
              onClick={handleAnalyze}
              className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <span>🔮</span>
              <span>AI에게 미래 직업 추천받기</span>
              <span>→</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
