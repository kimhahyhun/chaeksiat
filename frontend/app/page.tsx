"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { childrenApi, type Child } from "@/lib/api";
import { AVATARS, getAge } from "@/lib/utils";

export default function Home() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", birth_year: 2018, avatar: "bear" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    childrenApi.list().then(setChildren).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const child = await childrenApi.create(form);
      setChildren((prev) => [...prev, child]);
      setShowForm(false);
      setForm({ name: "", birth_year: 2018, avatar: "bear" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했어요");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-seed-50 to-seed-100">
      <header className="text-center pt-12 pb-6 px-4">
        <div className="text-5xl mb-3">🌱</div>
        <h1 className="text-4xl font-black text-seed-700">책씨앗</h1>
        <p className="text-seed-600 mt-2 text-lg">아이의 독서 습관이 자라나는 곳</p>
      </header>

      <section className="max-w-2xl mx-auto px-4 pb-12">
        <h2 className="text-xl font-bold text-gray-700 mb-4">누구의 책장을 볼까요?</h2>

        {loading ? (
          <div className="text-center py-16 text-4xl">📚</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/dashboard/${child.id}`}
                className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-all hover:scale-105 text-center border-2 border-seed-100"
              >
                <div className="text-5xl mb-3">{AVATARS[child.avatar] ?? "👶"}</div>
                <div className="font-bold text-gray-800 text-lg">{child.name}</div>
                <div className="text-sm text-gray-500 mt-1">{getAge(child.birth_year)}살</div>
              </Link>
            ))}

            <button
              onClick={() => setShowForm(true)}
              className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-all hover:scale-105 text-center border-2 border-dashed border-seed-300 text-seed-500 font-bold text-lg"
            >
              <div className="text-4xl mb-2">+</div>
              <div>아이 추가</div>
            </button>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl">
              <h3 className="text-2xl font-black text-gray-800 mb-6">새 아이 프로필</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">이름</label>
                  <input
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-seed-400"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="예: 민준이"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">태어난 해</label>
                  <input
                    type="number"
                    required
                    min={2000}
                    max={2024}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-seed-400"
                    value={form.birth_year}
                    onChange={(e) => setForm({ ...form, birth_year: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">아바타</label>
                  <div className="flex gap-3 flex-wrap">
                    {Object.entries(AVATARS).map(([key, emoji]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm({ ...form, avatar: key })}
                        className={`text-3xl p-2 rounded-xl transition-all ${
                          form.avatar === key
                            ? "bg-seed-100 ring-2 ring-seed-400 scale-110"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-seed-500 text-white font-bold hover:bg-seed-600 disabled:opacity-50"
                  >
                    {saving ? "저장 중..." : "완료"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
