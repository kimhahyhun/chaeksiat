"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { childrenApi, booksApi, analysisApi } from "@/lib/api";
import type { Child, ReadingRecord, ReadingAnalysis, RecommendedBook } from "@/lib/api";
import { AVATARS, KDC_COLORS, LEVEL_TREE, getAge, formatDate } from "@/lib/utils";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

type Tab = "books" | "analysis" | "recommend";

export default function Dashboard({ params }: { params: { childId: string } }) {
  const { childId } = params;
  const id = Number(childId);

  const [child, setChild] = useState<Child | null>(null);
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [analysis, setAnalysis] = useState<ReadingAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedBook[]>([]);
  const [tab, setTab] = useState<Tab>("books");
  const [loading, setLoading] = useState(true);
  const [loadingRec, setLoadingRec] = useState(false);

  // 책 추가 폼
  const [showAddBook, setShowAddBook] = useState(false);
  const [isbnInput, setIsbnInput] = useState("");
  const [ratingInput, setRatingInput] = useState(5);
  const [addingBook, setAddingBook] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    Promise.all([
      childrenApi.get(id),
      booksApi.listRecords(id),
      analysisApi.analyze(id),
    ]).then(([c, r, a]) => {
      setChild(c);
      setRecords(r);
      setAnalysis(a);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab === "recommend" && recommendations.length === 0) {
      setLoadingRec(true);
      analysisApi.recommend(id).then(setRecommendations).finally(() => setLoadingRec(false));
    }
  }, [tab, id, recommendations.length]);

  async function handleAddBook(e: React.FormEvent) {
    e.preventDefault();
    setAddingBook(true);
    setAddError("");
    try {
      const record = await booksApi.addRecord(id, {
        isbn13: isbnInput.trim(),
        read_at: new Date().toISOString().split("T")[0],
        rating: ratingInput,
      });
      setRecords((prev) => [record, ...prev]);
      const newAnalysis = await analysisApi.analyze(id);
      setAnalysis(newAnalysis);
      setShowAddBook(false);
      setIsbnInput("");
      setRatingInput(5);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "오류가 발생했어요");
    } finally {
      setAddingBook(false);
    }
  }

  async function handleDeleteRecord(recordId: number) {
    if (!confirm("이 독서 기록을 삭제할까요?")) return;
    try {
      await booksApi.deleteRecord(id, recordId);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      const newAnalysis = await analysisApi.analyze(id);
      setAnalysis(newAnalysis);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "삭제 중 오류가 발생했어요");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-4xl">
        📚
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">프로필을 찾을 수 없어요</p>
        <Link href="/" className="text-seed-500 font-semibold">돌아가기</Link>
      </div>
    );
  }

  const radarData = analysis
    ? Object.entries(analysis.category_distribution).map(([cat, count]) => ({
        category: cat,
        count,
      }))
    : [];

  return (
    <main className="min-h-screen bg-seed-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm px-4 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
        <span className="text-3xl">{AVATARS[child.avatar] ?? "👶"}</span>
        <div>
          <h1 className="text-xl font-black text-gray-800">{child.name}의 책씨앗</h1>
          <p className="text-sm text-gray-500">{getAge(child.birth_year)}살 · 부모 관리 화면</p>
        </div>
        <Link
          href={`/child/${id}`}
          className="ml-auto text-sm font-bold text-seed-600 bg-seed-50 px-3 py-1.5 rounded-xl hover:bg-seed-100 transition-colors"
        >
          🎮 아이 화면
        </Link>
      </header>

      {/* 레벨 + 뱃지 바 */}
      {analysis && (
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-500">총 {analysis.total_books}권</span>
              <div className="w-32 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-seed-400 rounded-full transition-all"
                  style={{ width: `${Math.min((analysis.level_score / 7) * 100, 100)}%` }}
                />
              </div>
            </div>
            {analysis.badges.map((badge) => (
              <span
                key={badge.name}
                className="bg-seed-100 text-seed-700 text-xs font-bold px-3 py-1 rounded-full"
              >
                🏅 {badge.name}{badge.level > 1 ? ` Lv.${badge.level}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex gap-1 mt-4 bg-white rounded-2xl p-1 shadow-sm">
          {(["books", "analysis", "recommend"] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = {
              books: "📖 내 책장",
              analysis: "📊 분석",
              recommend: "✨ 추천",
            };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-all ${
                  tab === t
                    ? "bg-seed-500 text-white shadow"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="mt-4 pb-24">
          {/* 내 책장 */}
          {tab === "books" && (
            <div>
              <button
                onClick={() => setShowAddBook(true)}
                className="w-full bg-seed-500 text-white font-bold py-3 rounded-2xl mb-4 hover:bg-seed-600 transition-colors"
              >
                + 읽은 책 추가하기
              </button>

              {records.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-5xl mb-3">📭</div>
                  <p>아직 읽은 책이 없어요</p>
                  <p className="text-sm mt-1">첫 번째 책을 추가해봐요!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {records.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white rounded-2xl p-4 shadow-sm flex gap-4 items-start"
                    >
                      {r.book.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.book.cover_url}
                          alt={r.book.title}
                          className="w-14 h-20 object-cover rounded-lg shadow flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                          📖
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 line-clamp-2">{r.book.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{r.book.authors}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {r.book.class_nm && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full text-white font-semibold"
                              style={{
                                background: KDC_COLORS[r.book.class_nm?.split(" ")[0] ?? ""] ?? "#9ca3af",
                              }}
                            >
                              {r.book.class_nm}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{formatDate(r.read_at)}</span>
                          {r.rating && (
                            <span className="text-xs text-yellow-500">{"⭐".repeat(Math.round(r.rating))}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteRecord(r.id)}
                        className="text-gray-300 hover:text-red-400 text-xl flex-shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 분석 탭 */}
          {tab === "analysis" && analysis && (
            <div className="space-y-4">
              {/* 요약 카드 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                  <div className="text-3xl font-black text-seed-600">{analysis.total_books}</div>
                  <div className="text-sm text-gray-500 mt-1">읽은 책</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                  <div className="text-3xl">{LEVEL_TREE[analysis.reading_level] ?? "🌱"}</div>
                  <div className="text-sm font-bold text-seed-600 mt-1">{analysis.reading_level} 단계</div>
                </div>
              </div>

              {/* 좋아하는 분야 */}
              {analysis.favorite_category && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-sm text-gray-500">가장 좋아하는 분야</p>
                  <p className="text-xl font-black text-gray-800 mt-1">
                    📚 {analysis.favorite_category}
                  </p>
                </div>
              )}

              {/* 분야별 레이더 차트 */}
              {radarData.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-3">분야별 독서 분포</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis
                        dataKey="category"
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                      />
                      <Radar
                        name="권수"
                        dataKey="count"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.3}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* 분야별 바 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3">분야별 권수</h3>
                <div className="space-y-2">
                  {Object.entries(analysis.category_distribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="w-20 text-sm text-gray-600 flex-shrink-0">{cat}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(count / analysis.total_books) * 100}%`,
                              background: KDC_COLORS[cat] ?? "#9ca3af",
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-700 w-6">{count}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* 뱃지 */}
              {analysis.badges.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-3">획득한 뱃지</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.badges.map((badge) => (
                      <div
                        key={badge.name}
                        className="bg-seed-50 border border-seed-200 rounded-2xl px-4 py-2 text-center"
                      >
                        <div className="text-xl">🏅</div>
                        <div className="text-xs font-bold text-seed-700 mt-1">
                          {badge.name}{badge.level > 1 ? ` Lv.${badge.level}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 추천 탭 */}
          {tab === "recommend" && (
            <div>
              {loadingRec ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-gray-500">맞춤 도서를 찾고 있어요...</p>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-5xl mb-3">📚</div>
                  <p>책을 더 읽으면 추천이 정확해져요!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((book, i) => (
                    <div key={book.isbn13 ?? i} className="bg-white rounded-2xl p-4 shadow-sm flex gap-4">
                      {book.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-14 h-20 object-cover rounded-lg shadow flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                          ✨
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 line-clamp-2">{book.title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{book.authors}</p>
                        <p className="text-xs text-seed-600 font-semibold mt-2 bg-seed-50 rounded-lg px-2 py-1 inline-block">
                          💡 {book.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 책 추가 모달 */}
      {showAddBook && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-xl font-black text-gray-800 mb-4">읽은 책 추가</h3>
            <form onSubmit={handleAddBook} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  ISBN-13 (책 뒷면 바코드 번호)
                </label>
                <input
                  required
                  pattern="[0-9]{13}"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-seed-400 text-lg tracking-widest"
                  value={isbnInput}
                  onChange={(e) => setIsbnInput(e.target.value)}
                  placeholder="9788934972464"
                  inputMode="numeric"
                />
                <p className="text-xs text-gray-400 mt-1">13자리 숫자를 입력하세요</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  별점
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRatingInput(n)}
                      className={`text-2xl transition-transform ${n <= ratingInput ? "scale-110" : "opacity-30"}`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
              {addError && <p className="text-red-500 text-sm">{addError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddBook(false); setAddError(""); }}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-600"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={addingBook}
                  className="flex-1 py-3 rounded-xl bg-seed-500 text-white font-bold hover:bg-seed-600 disabled:opacity-50"
                >
                  {addingBook ? "조회 중..." : "추가하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
