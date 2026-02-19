import { Category } from "../types";

export interface CategoryInfo {
  id: Category;
  label: string;
  labelShort: string;
  icon: string; // Ionicons name
  targetTimeSec: number;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: "table",
    label: "表の読み取り",
    labelShort: "表",
    icon: "grid-outline",
    targetTimeSec: 55,
    color: "#2563EB",
  },
  {
    id: "bar",
    label: "棒グラフ",
    labelShort: "棒",
    icon: "bar-chart-outline",
    targetTimeSec: 45,
    color: "#7C3AED",
  },
  {
    id: "pie",
    label: "円グラフ",
    labelShort: "円",
    icon: "pie-chart-outline",
    targetTimeSec: 40,
    color: "#D97706",
  },
  {
    id: "composite",
    label: "複合グラフ",
    labelShort: "複合",
    icon: "analytics-outline",
    targetTimeSec: 55,
    color: "#16A34A",
  },
];

export const CATEGORY_MAP: Record<Category, CategoryInfo> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<Category, CategoryInfo>;

export const MISTAKE_TAGS = [
  { id: "unit" as const, label: "単位" },
  { id: "ratio" as const, label: "割合" },
  { id: "oversight" as const, label: "見落とし" },
  { id: "estimation" as const, label: "概算" },
  { id: "time_pressure" as const, label: "時間不足" },
  { id: "misread" as const, label: "読み違い" },
];

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];
