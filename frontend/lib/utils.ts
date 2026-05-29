export const AVATARS: Record<string, string> = {
  bear: "🐻",
  rabbit: "🐰",
  cat: "🐱",
  fox: "🦊",
  penguin: "🐧",
  owl: "🦉",
};

export const KDC_COLORS: Record<string, string> = {
  "총류":      "#6366f1",
  "철학":      "#8b5cf6",
  "종교":      "#a78bfa",
  "사회과학":  "#3b82f6",
  "자연과학":  "#10b981",
  "기술·공학": "#f59e0b",
  "예술":      "#ec4899",
  "언어":      "#06b6d4",
  "문학":      "#22c55e",
  "역사·지리": "#f97316",
  "미분류":    "#9ca3af",
  "기타":      "#d1d5db",
};

export const LEVEL_TREE: Record<string, string> = {
  "씨앗":    "🌰",
  "새싹":    "🌱",
  "줄기":    "🪴",
  "가지":    "🌿",
  "잎사귀":  "🍃",
  "꽃":      "🌸",
  "열매":    "🍎",
  "나무":    "🌳",
};

export function getAge(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
