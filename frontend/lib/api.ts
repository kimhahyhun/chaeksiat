const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ──────────── 타입 ────────────

export interface Child {
  id: number;
  name: string;
  birth_year: number;
  avatar: string;
  created_at: string;
}

export interface Book {
  isbn13: string;
  title: string;
  authors: string | null;
  publisher: string | null;
  pub_date: string | null;
  class_no: string | null;
  class_nm: string | null;
  description: string | null;
  cover_url: string | null;
}

export interface ReadingRecord {
  id: number;
  isbn13: string;
  read_at: string;
  rating: number | null;
  book: Book;
}

export interface BadgeInfo {
  name: string;
  level: number;
}

export interface ReadingAnalysis {
  total_books: number;
  category_distribution: Record<string, number>;
  favorite_category: string | null;
  reading_level: string;
  level_score: number;
  badges: BadgeInfo[];
}

export interface RecommendedBook {
  isbn13: string;
  title: string;
  authors: string | null;
  publisher: string | null;
  class_no: string | null;
  class_nm: string | null;
  cover_url: string | null;
  reason: string;
}

// ──────────── API ────────────

export const childrenApi = {
  list: () => req<Child[]>("/children"),
  create: (data: { name: string; birth_year: number; avatar: string }) =>
    req<Child>("/children", { method: "POST", body: JSON.stringify(data) }),
  get: (id: number) => req<Child>(`/children/${id}`),
  update: (id: number, data: Partial<{ name: string; birth_year: number; avatar: string }>) =>
    req<Child>(`/children/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) => req<void>(`/children/${id}`, { method: "DELETE" }),
};

export const booksApi = {
  search: (isbn13: string) => req<Book>(`/books/search?isbn13=${isbn13}`),
  addRecord: (
    childId: number,
    data: { isbn13: string; read_at: string; rating?: number }
  ) =>
    req<ReadingRecord>(`/children/${childId}/records`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listRecords: (childId: number) =>
    req<ReadingRecord[]>(`/children/${childId}/records`),
  deleteRecord: (childId: number, recordId: number) =>
    req<void>(`/children/${childId}/records/${recordId}`, { method: "DELETE" }),
};

export interface LibrarianBook {
  id: number;
  isbn13: string | null;
  title: string;
  authors: string | null;
  publisher: string | null;
  pub_year: number | null;
  subject: string | null;
  target_age: string;
  cover_url: string | null;
}

export interface ReadingGoal {
  id: number;
  period: "weekly" | "monthly";
  target_count: number;
  current_count: number;
  period_start: string;
  period_end: string;
}

export const goalsApi = {
  get: (childId: number) => req<ReadingGoal | null>(`/children/${childId}/goal`),
  set: (childId: number, data: { period: "weekly" | "monthly"; target_count: number }) =>
    req<ReadingGoal>(`/children/${childId}/goal`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const analysisApi = {
  analyze: (childId: number) => req<ReadingAnalysis>(`/children/${childId}/analysis`),
  recommend: (childId: number) =>
    req<RecommendedBook[]>(`/children/${childId}/recommendations`),
  popularBooks: (age: number) =>
    req<RecommendedBook[]>(`/popular-books?age=${age}`),
  librarianBooks: (age: number) =>
    req<LibrarianBook[]>(`/librarian-books?age=${age}&limit=10`),
};
