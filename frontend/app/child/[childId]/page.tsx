"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { childrenApi, booksApi, analysisApi } from "@/lib/api";
import type { Child, ReadingAnalysis, ReadingRecord, RecommendedBook, LibrarianBook } from "@/lib/api";
import { AVATARS, LEVEL_TREE, KDC_COLORS } from "@/lib/utils";

// 열매 위치 — 큰 나무(260px+) 수관 중심부 기준
const FRUIT_POSITIONS = [
  { top: "42%", left: "50%" },
  { top: "35%", left: "40%" },
  { top: "35%", left: "60%" },
  { top: "50%", left: "37%" },
  { top: "50%", left: "63%" },
  { top: "30%", left: "50%" },
  { top: "55%", left: "43%" },
  { top: "55%", left: "57%" },
  { top: "40%", left: "34%" },
  { top: "40%", left: "66%" },
  { top: "46%", left: "50%" },
  { top: "33%", left: "44%" },
  { top: "33%", left: "56%" },
  { top: "52%", left: "50%" },
  { top: "38%", left: "47%" },
];

// 분야별 단계 기준 (읽은 권수)
const FIELD_LEVELS = [
  { min: 0,  label: "씨앗",   emoji: "🌰" },
  { min: 3,  label: "새싹",   emoji: "🌱" },
  { min: 7,  label: "줄기",   emoji: "🪴" },
  { min: 12, label: "가지",   emoji: "🌿" },
  { min: 20, label: "잎사귀", emoji: "🍃" },
  { min: 30, label: "열매",   emoji: "🌸" },
];

function getFieldLevel(count: number) {
  let result = FIELD_LEVELS[0];
  for (const lvl of FIELD_LEVELS) {
    if (count >= lvl.min) result = lvl;
  }
  const nextIdx = FIELD_LEVELS.indexOf(result) + 1;
  const next = FIELD_LEVELS[nextIdx];
  return { ...result, toNext: next ? next.min - count : 0, isMax: !next };
}

// 전체 배지 목록
const ALL_BADGES = [
  { name: "문학왕",    emoji: "📚", desc: "문학 5권 이상" },
  { name: "과학탐험가", emoji: "🔬", desc: "자연과학 3권 이상" },
  { name: "사회박사",  emoji: "🌍", desc: "사회과학 3권 이상" },
  { name: "예술가",    emoji: "🎨", desc: "예술 3권 이상" },
  { name: "역사학자",  emoji: "🏛️", desc: "역사·지리 3권 이상" },
  { name: "만독왕",    emoji: "👑", desc: "총 20권 이상" },
  { name: "균형독서가", emoji: "⚖️", desc: "5개 분야 이상 2권씩" },
];

// 정글 탐험 미션 목록
const JUNGLE_MISSIONS = [
  {
    id: 1, emoji: "🌱", name: "첫 발걸음",
    desc: "책 1권 읽기",
    badge: "탐험 시작",
    check: (total: number, _dist: Record<string, number>, streak: number) => total >= 1,
  },
  {
    id: 2, emoji: "🦋", name: "숲속 친구",
    desc: "책 3권 읽기",
    badge: "숲속 친구",
    check: (total: number) => total >= 3,
  },
  {
    id: 3, emoji: "🍄", name: "버섯 발견",
    desc: "2개 분야 이상 읽기",
    badge: "분야 탐험가",
    check: (_total: number, dist: Record<string, number>) => Object.keys(dist).length >= 2,
  },
  {
    id: 4, emoji: "🐸", name: "개울 건너기",
    desc: "책 5권 읽기",
    badge: "개울 건너기",
    check: (total: number) => total >= 5,
  },
  {
    id: 5, emoji: "🔥", name: "모닥불 캠프",
    desc: "3일 연속 읽기",
    badge: "불꽃 독서가",
    check: (_total: number, _dist: Record<string, number>, streak: number) => streak >= 3,
  },
  {
    id: 6, emoji: "🌺", name: "꽃밭 도착",
    desc: "3개 분야 이상 읽기",
    badge: "다양한 독서가",
    check: (_total: number, dist: Record<string, number>) => Object.keys(dist).length >= 3,
  },
  {
    id: 7, emoji: "🦁", name: "사자 만남",
    desc: "책 10권 읽기",
    badge: "정글의 용사",
    check: (total: number) => total >= 10,
  },
  {
    id: 8, emoji: "🏔️", name: "정상 정복",
    desc: "책 20권 읽기",
    badge: "정글 마스터",
    check: (total: number) => total >= 20,
  },
  {
    id: 9, emoji: "⭐", name: "전설 달성",
    desc: "책 50권 읽기",
    badge: "전설의 탐험가",
    check: (total: number) => total >= 50,
  },
];

const TIER_INFO: Record<string, { name: string; color: string; bg: string }> = {
  "씨앗":    { name: "새싹 독서가",    color: "#86efac", bg: "#f0fdf4" },
  "새싹":    { name: "초보 독서가",    color: "#4ade80", bg: "#dcfce7" },
  "줄기":    { name: "성장 독서가",    color: "#22c55e", bg: "#bbf7d0" },
  "가지":    { name: "열정 독서가",    color: "#16a34a", bg: "#86efac" },
  "잎사귀":  { name: "숙련 독서가",    color: "#0284c7", bg: "#e0f2fe" },
  "꽃":      { name: "고급 독서가",    color: "#7c3aed", bg: "#ede9fe" },
  "열매":    { name: "플래티넘 독서왕", color: "#d97706", bg: "#fef3c7" },
  "나무":    { name: "전설의 독서왕",  color: "#dc2626", bg: "#fee2e2" },
};

export default function ChildDashboard({ params }: { params: { childId: string } }) {
  const id = Number(params.childId);

  const [child, setChild] = useState<Child | null>(null);
  const [analysis, setAnalysis] = useState<ReadingAnalysis | null>(null);
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [popularBooks, setPopularBooks] = useState<RecommendedBook[]>([]);
  const [librarianBooks, setLibrarianBooks] = useState<LibrarianBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      childrenApi.get(id),
      booksApi.listRecords(id),
      analysisApi.analyze(id),
    ]).then(([c, r, a]) => {
      setChild(c);
      setRecords(r);
      setAnalysis(a);
      const age = Math.min(new Date().getFullYear() - c.birth_year, 19);
      analysisApi.popularBooks(Math.max(age, 1)).then(setPopularBooks).catch(() => {});
      analysisApi.librarianBooks(Math.max(age, 1)).then(setLibrarianBooks).catch(() => {});
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-blue-50">
        <div className="text-center">
          <div className="text-6xl animate-bounce">🌱</div>
          <p className="text-green-600 font-bold mt-3">책씨앗을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!child) return null;

  const totalBooks = analysis?.total_books ?? 0;
  const level = analysis?.reading_level ?? "씨앗";
  const tier = TIER_INFO[level] ?? TIER_INFO["씨앗"];

  const childAge = new Date().getFullYear() - child.birth_year;
  const ageGroupLabel =
    childAge <= 7 ? "영유아가" :
    childAge <= 10 ? "초등 저학년이" :
    "초등 고학년이";

  // 완성된 나무 개수(=현재 레벨 단계) + 이번 나무 진행 상황
  const completedTrees = analysis?.level_score ?? 0;
  const levelThresholds = [0, 3, 10, 20, 35, 50, 75, 100];
  const curLevelStart = levelThresholds[completedTrees] ?? 0;
  const nextLevelStart = levelThresholds[completedTrees + 1];
  const isMaxLevel = nextLevelStart === undefined;
  const booksIntoLevel = totalBooks - curLevelStart;
  const levelSpan = isMaxLevel ? FRUIT_POSITIONS.length : nextLevelStart - curLevelStart;
  const fruitsOnTree = Math.min(booksIntoLevel, FRUIT_POSITIONS.length, levelSpan);
  const progressToNext = isMaxLevel ? 100 : (booksIntoLevel / levelSpan) * 100;
  const booksToNext = isMaxLevel ? 0 : nextLevelStart - totalBooks;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-100 via-green-50 to-emerald-100">

      {/* 상단 헤더 */}
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <Link href="/" className="text-2xl">🏠</Link>
        <h1 className="text-lg font-black text-green-700">📚 책씨앗</h1>
        <Link href={`/parent/${id}`} className="text-xl" title="부모 관리 화면">⚙️</Link>
      </header>

      <div className="max-w-lg mx-auto px-4 pb-16 space-y-4">

        {/* 프로필 배너 */}
        <div
          className="rounded-3xl p-5 shadow-lg relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${tier.color}33, ${tier.bg})` }}
        >
          <div className="flex items-center gap-4">
            <div className="text-6xl">{AVATARS[child.avatar] ?? "👶"}</div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-gray-800">{child.name}</h2>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <div
                  className="text-sm font-bold px-3 py-0.5 rounded-full"
                  style={{ background: tier.color + "33", color: tier.color }}
                >
                  {LEVEL_TREE[level]} {level} (Lv.{analysis?.level_score ?? 0})
                </div>
                {analysis?.badges.map((badge) => {
                  const b = ALL_BADGES.find((a) => a.name === badge);
                  return b ? (
                    <span
                      key={badge}
                      className="text-xs font-bold bg-white/70 px-2 py-0.5 rounded-full text-gray-700 flex items-center gap-0.5"
                    >
                      <span>{b.emoji}</span>
                      <span>{badge}</span>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-seed-600">{totalBooks}권</div>
              <div className="text-xs text-gray-500">읽은 책</div>
            </div>
          </div>
        </div>

        {/* 책 추가 버튼 */}
        <Link
          href={`/parent/${id}`}
          className="block w-full bg-green-500 text-white font-black text-lg py-4 rounded-2xl text-center shadow-lg hover:bg-green-600 active:scale-95 transition-all"
        >
          📖 읽은 책 추가하기
        </Link>

        {/* 지식나무 — 책 열매 키우기 */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-lg font-black text-gray-800">
              🌳 지식나무 — 책 열매 키우기
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              책을 읽을수록 나무에 열매가 열려요!
            </p>
            {completedTrees > 0 && (
              <div className="mt-2 bg-seed-50 rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-xs font-bold text-seed-700">나의 작은 숲</span>
                <span className="text-lg leading-none">{"🌳".repeat(Math.min(completedTrees, 10))}</span>
                <span className="text-xs text-seed-600 font-semibold">{completedTrees}그루 완성!</span>
              </div>
            )}
          </div>

          {/* 나무 영역 */}
          <div
            className="relative mx-4 mb-4 rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #bfdbfe 0%, #dbeafe 40%, #bbf7d0 70%, #86efac 100%)",
              height: 280,
            }}
          >
            {/* 구름 */}
            <div className="absolute top-3 left-6 text-3xl opacity-60">☁️</div>
            <div className="absolute top-5 right-8 text-2xl opacity-50">☁️</div>

            {/* 나무 이모지 */}
            <div
              className="absolute left-1/2 -translate-x-1/2 select-none transition-all duration-700"
              style={{
                bottom: -10,
                fontSize: `${Math.min(260 + (analysis?.level_score ?? 0) * 10, 320)}px`,
                lineHeight: 1,
              }}
            >
              🌳
            </div>

            {/* 열매들 */}
            {FRUIT_POSITIONS.slice(0, fruitsOnTree).map((pos, i) => (
              <div
                key={i}
                className="absolute text-xl animate-grow select-none"
                style={{ top: pos.top, left: pos.left }}
              >
                🍎
              </div>
            ))}

            {/* 레벨 뱃지 */}
            <div className="absolute top-3 right-3 bg-white/80 backdrop-blur rounded-2xl px-3 py-1.5 text-center shadow">
              <div className="text-lg font-black text-green-700">Lv.{analysis?.level_score ?? 0}</div>
              <div className="text-xs text-gray-500">{level}</div>
            </div>
          </div>

          {/* 다음 레벨까지 진행바 */}
          <div className="px-5 pb-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-600">
                🍎 열매 {fruitsOnTree}개
              </span>
              {!isMaxLevel ? (
                <span className="text-green-600 font-bold">
                  책 {booksToNext}권 더 읽으면 새 나무로 레벨업! ✨
                </span>
              ) : (
                <span className="text-amber-500 font-bold">🏆 최고 레벨이에요!</span>
              )}
            </div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(progressToNext, 100)}%`,
                  background: "linear-gradient(90deg, #4ade80, #22c55e)",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>총 {totalBooks}권 읽음</span>
              <span>{level} 단계</span>
            </div>
          </div>
        </div>

        {/* ── 현재 가장 인기 있는 도서 ── */}
        {popularBooks.length > 0 && (
          <div className="bg-white rounded-3xl shadow-lg p-5">
            <h3 className="text-lg font-black text-gray-800 mb-1">🔥 현재 가장 인기 있는 도서</h3>
            <p className="text-sm text-gray-400 mb-4">지금 {ageGroupLabel} 도서관에서 제일 많이 빌리는 책이에요!</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {popularBooks.slice(0, 10).map((book, i) => (
                <div
                  key={book.isbn13 || i}
                  className="flex-shrink-0 w-28"
                >
                  {/* 표지 */}
                  <div className="w-28 h-40 rounded-xl overflow-hidden shadow-md bg-gray-100 mb-2 relative">
                    {book.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">📚</div>
                    )}
                    {/* 순위 뱃지 */}
                    <div className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shadow ${
                      i === 0 ? "bg-amber-400" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-orange-400" : "bg-green-400"
                    }`}>
                      {i + 1}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-gray-700 line-clamp-2 leading-tight">{book.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{book.authors?.split(";")[0]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 사서 선생님 추천 ── */}
        {librarianBooks.length > 0 && (
          <div className="bg-white rounded-3xl shadow-lg p-5">
            <h3 className="text-lg font-black text-gray-800 mb-1">📚 사서 선생님 추천</h3>
            <p className="text-sm text-gray-400 mb-4">
              사서 선생님이 직접 고른 책이에요!
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {librarianBooks.map((book, i) => (
                <div key={book.id} className="flex-shrink-0 w-28">
                  {/* 표지 */}
                  <div className="w-28 h-40 rounded-xl overflow-hidden shadow-md mb-2 relative bg-amber-50 border border-amber-100">
                    {book.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center px-2">
                          <div className="text-2xl mb-1">📖</div>
                          <p className="text-xs font-bold text-amber-800 line-clamp-3 leading-tight">
                            {book.title}
                          </p>
                        </div>
                      </div>
                    )}
                    {/* 추천 뱃지 */}
                    <div className="absolute top-1.5 right-1.5 bg-amber-400 text-white text-xs font-black px-1.5 py-0.5 rounded-full">
                      ⭐
                    </div>
                  </div>
                  <p className="text-xs font-bold text-gray-700 line-clamp-2 leading-tight">{book.title}</p>
                  {book.subject && (
                    <span className="text-xs text-amber-600 font-semibold">{book.subject}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 독서 정글 탐험 ── */}
        {(() => {
          const total = analysis?.total_books ?? 0;
          const dist = analysis?.category_distribution ?? {};
          const readDates = new Set(records.map((r) => r.read_at.slice(0, 10)));
          let streak = 0;
          const now = new Date();
          for (let i = 0; i < 30; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            if (readDates.has(d.toISOString().slice(0, 10))) streak++;
            else if (i > 0) break;
          }

          const results = JUNGLE_MISSIONS.map((m) => ({
            ...m,
            done: m.check(total, dist, streak),
          }));
          const firstLocked = results.find((m) => !m.done);

          return (
            <div className="bg-white rounded-3xl shadow-lg p-5 overflow-hidden">
              <h3 className="text-lg font-black text-gray-800 mb-1">🌴 독서 정글 탐험</h3>
              <p className="text-sm text-gray-400 mb-5">미션을 달성하면 뱃지가 열려요!</p>

              <div className="relative">
                {/* 연결 경로선 */}
                <div className="absolute left-7 top-4 bottom-4 w-0.5 bg-gradient-to-b from-green-300 via-yellow-300 to-gray-200 z-0" />

                <div className="space-y-3 relative z-10">
                  {results.map((mission, idx) => {
                    const isNext = !mission.done && firstLocked?.id === mission.id;
                    return (
                      <div key={mission.id} className="flex items-center gap-4">
                        {/* 노드 */}
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow transition-all ${
                            mission.done
                              ? "bg-green-400 scale-110 shadow-green-200"
                              : isNext
                              ? "bg-amber-100 border-2 border-amber-400 animate-pulse"
                              : "bg-gray-100 grayscale opacity-50"
                          }`}
                        >
                          {mission.done ? "✅" : mission.emoji}
                        </div>

                        {/* 내용 */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-base ${mission.done ? "text-green-700" : isNext ? "text-amber-700" : "text-gray-400"}`}>
                              {mission.name}
                            </span>
                            {mission.done && (
                              <span className="text-xs bg-green-100 text-green-600 font-bold px-2 py-0.5 rounded-full">완료!</span>
                            )}
                            {isNext && (
                              <span className="text-xs bg-amber-100 text-amber-600 font-bold px-2 py-0.5 rounded-full">진행중</span>
                            )}
                          </div>
                          <p className={`text-sm mt-0.5 ${mission.done ? "text-gray-500" : isNext ? "text-amber-600" : "text-gray-300"}`}>
                            {mission.desc}
                          </p>
                          {mission.done && (
                            <span className="text-xs text-amber-500 font-semibold">🏅 {mission.badge}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 전체 진행률 */}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold text-gray-600">탐험 진행률</span>
                  <span className="font-black text-green-600">
                    {results.filter((m) => m.done).length} / {results.length}
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(results.filter((m) => m.done).length / results.length) * 100}%`,
                      background: "linear-gradient(90deg, #4ade80, #22c55e)",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── 나의 독서 밭 ── */}
        <div className="bg-white rounded-3xl shadow-lg p-5">
          <h3 className="text-lg font-black text-gray-800 mb-1">🌾 나의 독서 밭</h3>
          <p className="text-sm text-gray-400 mb-4">분야별로 책을 읽으면 밭이 자라요!</p>
          {analysis && Object.keys(analysis.category_distribution).length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(analysis.category_distribution)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count]) => {
                  const lv = getFieldLevel(count);
                  return (
                    <div
                      key={cat}
                      className="rounded-2xl p-3 border-2"
                      style={{ borderColor: KDC_COLORS[cat] + "44", background: KDC_COLORS[cat] + "11" }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold" style={{ color: KDC_COLORS[cat] }}>{cat}</span>
                        <span className="text-lg">{lv.emoji}</span>
                      </div>
                      <div className="text-xl font-black text-gray-800">{count}권</div>
                      <div className="text-xs text-gray-500 mt-0.5">{lv.label} 단계</div>
                      {!lv.isMax && (
                        <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(count / (count + lv.toNext)) * 100}%`,
                              background: KDC_COLORS[cat],
                            }}
                          />
                        </div>
                      )}
                      {!lv.isMax && (
                        <div className="text-xs text-gray-400 mt-1">{lv.toNext}권 더 읽으면 성장!</div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-300">
              <div className="text-4xl mb-2">🌾</div>
              <p className="text-sm">책을 읽으면 밭이 생겨요!</p>
            </div>
          )}
        </div>

        {/* ── 배지 컬렉션 ── */}
        <div className="bg-white rounded-3xl shadow-lg p-5">
          <h3 className="text-lg font-black text-gray-800 mb-1">🏅 배지 컬렉션</h3>
          <p className="text-sm text-gray-400 mb-4">조건을 달성하면 배지를 획득해요!</p>
          <div className="grid grid-cols-4 gap-3">
            {ALL_BADGES.map((badge) => {
              const earned = analysis?.badges.includes(badge.name) ?? false;
              return (
                <div key={badge.name} className="text-center">
                  <div
                    className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl mb-1 ${
                      earned
                        ? "bg-amber-50 border-2 border-amber-300 shadow"
                        : "bg-gray-100 grayscale opacity-40"
                    }`}
                  >
                    {badge.emoji}
                  </div>
                  <div className={`text-xs font-bold ${earned ? "text-amber-600" : "text-gray-400"}`}>
                    {badge.name}
                  </div>
                  {!earned && (
                    <div className="text-xs text-gray-300 mt-0.5 leading-tight">{badge.desc}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 출석 도장판 ── */}
        {(() => {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const readDates = new Set(records.map((r) => r.read_at.slice(0, 10)));

          // 연속 streak 계산
          let streak = 0;
          for (let i = 0; i < 30; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            if (readDates.has(key)) streak++;
            else if (i > 0) break;
          }

          return (
            <div className="bg-white rounded-3xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-black text-gray-800">📅 출석 도장판</h3>
                {streak > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-1 text-sm font-black text-orange-500">
                    🔥 {streak}일 연속!
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-4">
                {now.getMonth() + 1}월 · 책 읽은 날에 도장이 찍혀요
              </p>
              <div className="grid grid-cols-7 gap-1.5">
                {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                  <div key={d} className="text-center text-xs text-gray-400 font-semibold pb-1">{d}</div>
                ))}
                {/* 시작 요일 공백 */}
                {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isToday = day === now.getDate();
                  const hasRead = readDates.has(dateStr);
                  return (
                    <div
                      key={day}
                      className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                        hasRead
                          ? "bg-green-400 text-white shadow-sm"
                          : isToday
                          ? "bg-green-50 border-2 border-green-300 text-green-600"
                          : "bg-gray-50 text-gray-400"
                      }`}
                    >
                      {hasRead ? "📖" : day}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      </div>
    </main>
  );
}
