"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { childrenApi, booksApi, analysisApi } from "@/lib/api";
import type { Child, ReadingAnalysis } from "@/lib/api";
import { AVATARS, LEVEL_TREE } from "@/lib/utils";

// 책 수에 따른 열매 위치 (나무 위에 자연스럽게 배치)
const FRUIT_POSITIONS = [
  { top: "28%", left: "48%" },
  { top: "22%", left: "38%" },
  { top: "22%", left: "58%" },
  { top: "32%", left: "32%" },
  { top: "32%", left: "64%" },
  { top: "18%", left: "48%" },
  { top: "38%", left: "28%" },
  { top: "38%", left: "68%" },
  { top: "14%", left: "40%" },
  { top: "14%", left: "56%" },
  { top: "42%", left: "36%" },
  { top: "42%", left: "60%" },
  { top: "10%", left: "48%" },
  { top: "26%", left: "26%" },
  { top: "26%", left: "70%" },
];

const FRUITS_PER_LEVEL = 5; // 열매 5개마다 레벨업

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      childrenApi.get(id),
      booksApi.listRecords(id),
      analysisApi.analyze(id),
    ]).then(([c, , a]) => {
      setChild(c);
      setAnalysis(a);
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
  const points = totalBooks * 10;
  const tier = TIER_INFO[level] ?? TIER_INFO["씨앗"];

  // 현재 레벨에서 열매 몇 개인지
  const fruitsOnTree = Math.min(totalBooks % FRUITS_PER_LEVEL || (totalBooks > 0 ? FRUITS_PER_LEVEL : 0), FRUIT_POSITIONS.length);
  const progressToNext = ((totalBooks % FRUITS_PER_LEVEL) / FRUITS_PER_LEVEL) * 100;
  const booksToNext = FRUITS_PER_LEVEL - (totalBooks % FRUITS_PER_LEVEL);

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
              <div
                className="inline-block text-sm font-bold px-3 py-0.5 rounded-full mt-1"
                style={{ background: tier.color + "33", color: tier.color }}
              >
                {LEVEL_TREE[level]} {tier.name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-amber-500">{points}P</div>
              <div className="text-xs text-gray-500">총 {totalBooks}권</div>
            </div>
          </div>
        </div>

        {/* 지식나무 — 책 열매 키우기 */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-lg font-black text-gray-800">
              🌳 지식나무 — 책 열매 키우기
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              책을 읽을수록 나무에 열매가 열려요!
            </p>
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

            {/* 나무 이모지 (레벨에 따라 크기 변화) */}
            <div
              className="absolute left-1/2 -translate-x-1/2 select-none transition-all duration-700"
              style={{
                bottom: 20,
                fontSize: `${Math.min(80 + analysis?.level_score! * 12, 160)}px`,
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

          {/* 다음 열매까지 진행바 */}
          <div className="px-5 pb-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-600">
                🍎 열매 {fruitsOnTree} / {FRUITS_PER_LEVEL}개
              </span>
              {totalBooks > 0 && booksToNext < FRUITS_PER_LEVEL ? (
                <span className="text-green-600 font-bold">
                  책 {booksToNext}권 더 읽으면 레벨업! ✨
                </span>
              ) : (
                <span className="text-gray-400 text-xs">책을 읽고 열매를 키워봐요</span>
              )}
            </div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${totalBooks === 0 ? 0 : progressToNext || 100}%`,
                  background: "linear-gradient(90deg, #4ade80, #22c55e)",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>총 {totalBooks}권 읽음</span>
              <span>{points}P 획득</span>
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

      </div>
    </main>
  );
}
