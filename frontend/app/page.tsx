"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { childrenApi, type Child } from "@/lib/api";
import { AVATARS, getAge } from "@/lib/utils";

const EMPTY_FORM = { name: "", birth_year: 2018, avatar: "bear" };

export default function Home() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Child | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    childrenApi.list().then(setChildren).finally(() => setLoading(false));
  }, []);

  function openEdit(child: Child) {
    setForm({ name: child.name, birth_year: child.birth_year, avatar: child.avatar });
    setError("");
    setEditTarget(child);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setError("");
    setShowCreate(true);
  }

  function closeModal() {
    setEditTarget(null);
    setShowCreate(false);
    setError("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const child = await childrenApi.create(form);
      setChildren((prev) => [...prev, child]);
      closeModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했어요");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editTarget) return;
    if (!confirm(`${editTarget.name}의 프로필을 삭제할까요?\n독서 기록도 모두 삭제됩니다.`)) return;
    try {
      await childrenApi.delete(editTarget.id);
      setChildren((prev) => prev.filter((c) => c.id !== editTarget.id));
      closeModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "삭제 중 오류가 발생했어요");
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    setError("");
    try {
      const updated = await childrenApi.update(editTarget.id, form);
      setChildren((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      closeModal();
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
              <div key={child.id} className="relative">
                <Link
                  href={`/child/${child.id}`}
                  className="block bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-all hover:scale-105 text-center border-2 border-seed-100"
                >
                  <div className="text-5xl mb-3">{AVATARS[child.avatar] ?? "👶"}</div>
                  <div className="font-bold text-gray-800 text-lg">{child.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{getAge(child.birth_year)}살</div>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); openEdit(child); }}
                  className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow text-base flex items-center justify-center hover:bg-seed-50 transition-colors"
                  title="프로필 수정"
                >
                  ✏️
                </button>
              </div>
            ))}

            <button
              onClick={openCreate}
              className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-all hover:scale-105 text-center border-2 border-dashed border-seed-300 text-seed-500 font-bold text-lg"
            >
              <div className="text-4xl mb-2">+</div>
              <div>아이 추가</div>
            </button>
          </div>
        )}

        {/* 프로필 수정 모달 */}
        {editTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-2xl font-black text-gray-800">프로필 수정</h3>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-sm text-red-400 hover:text-red-600 font-semibold px-3 py-1 rounded-xl hover:bg-red-50 transition-colors"
                >
                  삭제
                </button>
              </div>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">이름</label>
                  <input
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-seed-400"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                    onClick={closeModal}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-seed-500 text-white font-bold hover:bg-seed-600 disabled:opacity-50"
                  >
                    {saving ? "저장 중..." : "수정 완료"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 아이 추가 모달 */}
        {showCreate && (
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
                    onClick={closeModal}
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
