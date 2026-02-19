// ===================================================
// GAB Study 出題ロジック
// スキマ学習のセッション構成・おすすめ生成を担当
// ===================================================

import { Problem, Attempt, ReviewQueueItem, Category } from "../types";
import { CATEGORY_MAP } from "../constants/categories";

// ===== ユーティリティ関数 =====

/** カテゴリに基づく推定解答時間（セッション時間計算用） */
function estimateSolveSeconds(category: Category): number {
  return CATEGORY_MAP[category]?.targetTimeSec ?? 50;
}

/** カテゴリ別の目標時間（秒）を取得 */
export function targetTimeForCategory(category: Category): number {
  return CATEGORY_MAP[category]?.targetTimeSec ?? 50;
}

// ===== クイック学習セッション構成 =====

/**
 * クイック学習用の問題を選出する（60秒/3分/5分）
 *
 * 優先順位:
 *   1. 復習期限が来た問題（間隔反復キュー）
 *   2. 正解だが遅い問題（スピード強化）
 *   3. 直近で間違えた問題（復習）
 *   4. 未学習の問題（易しい順）
 *
 * @param targetSeconds セッション目標時間（秒）
 * @param allProblems 全問題リスト
 * @param latestAttempts 各問題の最新解答
 * @param dueReviews 復習期限が来ているアイテム
 */
export function pickQuickSession(
  targetSeconds: number,
  allProblems: Problem[],
  latestAttempts: Map<string, Attempt>,
  dueReviews: ReviewQueueItem[]
): Problem[] {
  const dueSet = new Set(dueReviews.map((r) => r.problemId));

  // 1) 復習期限が来ている問題（最優先）
  const due = allProblems
    .filter((p) => dueSet.has(p.id))
    .sort((a, b) => {
      const rA = dueReviews.find((r) => r.problemId === a.id);
      const rB = dueReviews.find((r) => r.problemId === b.id);
      return (rA?.nextReviewAt ?? "").localeCompare(rB?.nextReviewAt ?? "");
    });

  // 2) 正解だが目標時間を超過した問題
  const slow = allProblems
    .filter((p) => {
      const a = latestAttempts.get(p.id);
      if (!a) return false;
      return a.isCorrect && a.timeMs > targetTimeForCategory(p.category) * 1000;
    })
    .sort((a, b) => {
      const aTime = latestAttempts.get(a.id)?.timeMs ?? 0;
      const bTime = latestAttempts.get(b.id)?.timeMs ?? 0;
      return bTime - aTime; // 遅い順
    });

  // 3) 直近で間違えた問題
  const wrongRecent = allProblems
    .filter((p) => {
      const a = latestAttempts.get(p.id);
      return a && !a.isCorrect;
    })
    .sort((a, b) => {
      const aDate = latestAttempts.get(a.id)?.answeredAt ?? "";
      const bDate = latestAttempts.get(b.id)?.answeredAt ?? "";
      return bDate.localeCompare(aDate); // 新しい順
    });

  // 4) 未学習の問題（難易度低い順）
  const unseen = allProblems
    .filter((p) => !latestAttempts.has(p.id))
    .sort((a, b) => a.difficulty - b.difficulty);

  // セッション構成: 各プールから順に追加し、目標時間に達したら終了
  const pools = [due, slow, wrongRecent, unseen];
  const picked: Problem[] = [];
  const pickedSet = new Set<string>();
  let estimatedTime = 0;

  for (const pool of pools) {
    for (const p of pool) {
      if (pickedSet.has(p.id)) continue;
      picked.push(p);
      pickedSet.add(p.id);
      estimatedTime += estimateSolveSeconds(p.category);
      if (estimatedTime >= targetSeconds) {
        return picked;
      }
    }
  }

  return picked;
}

// ===== 復習セッション構成 =====

/**
 * 復習専用セッション: 復習期限の問題＋最近の間違いから構成
 */
export function pickReviewSession(
  allProblems: Problem[],
  latestAttempts: Map<string, Attempt>,
  dueReviews: ReviewQueueItem[],
  maxCount: number = 10
): Problem[] {
  const dueSet = new Set(dueReviews.map((r) => r.problemId));

  // 復習期限問題 + 直近の間違いを統合
  const candidates = allProblems
    .filter((p) => {
      const a = latestAttempts.get(p.id);
      return dueSet.has(p.id) || (a && !a.isCorrect);
    })
    .sort((a, b) => {
      // 復習期限問題を優先、次に日時順
      const aDue = dueSet.has(a.id) ? 0 : 1;
      const bDue = dueSet.has(b.id) ? 0 : 1;
      if (aDue !== bDue) return aDue - bDue;
      const aDate = latestAttempts.get(a.id)?.answeredAt ?? "";
      const bDate = latestAttempts.get(b.id)?.answeredAt ?? "";
      return aDate.localeCompare(bDate);
    });

  return candidates.slice(0, maxCount);
}

// ===== スピード強化セッション構成 =====

/**
 * スピード強化: 正解だが目標時間を超過した問題を遅い順に選出
 */
export function pickSpeedSession(
  allProblems: Problem[],
  latestAttempts: Map<string, Attempt>,
  maxCount: number = 10
): Problem[] {
  return allProblems
    .filter((p) => {
      const a = latestAttempts.get(p.id);
      if (!a) return false;
      return a.isCorrect && a.timeMs > targetTimeForCategory(p.category) * 1000;
    })
    .sort((a, b) => {
      const aTime = latestAttempts.get(a.id)?.timeMs ?? 0;
      const bTime = latestAttempts.get(b.id)?.timeMs ?? 0;
      return bTime - aTime; // 遅い順
    })
    .slice(0, maxCount);
}

// ===== 弱点テスト構成 =====

/**
 * 弱点テスト: 間違い＋遅い問題をスコアリングし、弱い順に選出
 * スコア = 不正解:+10点, 目標超過:超過秒数
 */
export function pickWeaknessTest(
  allProblems: Problem[],
  latestAttempts: Map<string, Attempt>,
  count: number = 20
): Problem[] {
  const scored = allProblems
    .filter((p) => latestAttempts.has(p.id))
    .map((p) => {
      const a = latestAttempts.get(p.id)!;
      let score = 0;
      // 不正解は大きなペナルティ
      if (!a.isCorrect) score += 10;
      // 目標時間超過分をスコアに加算
      const overTime =
        a.timeMs - targetTimeForCategory(p.category) * 1000;
      if (overTime > 0) score += overTime / 1000;
      return { problem: p, score };
    })
    .sort((a, b) => b.score - a.score); // 弱い順

  return scored.slice(0, count).map((s) => s.problem);
}

// ===== ホーム画面おすすめ生成 =====

/** おすすめカードのデータ */
export interface Recommendation {
  title: string;
  /** おすすめ理由 */
  reason: string;
  type: "review" | "speed" | "category_weak" | "drill";
  /** 推定所要時間（分） */
  estimatedMinutes: number;
  category?: Category;
}

/**
 * ホーム画面の「今日のおすすめ」カードを生成
 * 学習状況に基づき、復習・スピード・苦手カテゴリを提案
 */
export function generateRecommendations(
  allProblems: Problem[],
  latestAttempts: Map<string, Attempt>,
  dueReviews: ReviewQueueItem[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // --- 復習期限の問題チェック ---
  const dueCount = dueReviews.filter(
    (r) => new Date(r.nextReviewAt) <= new Date()
  ).length;
  if (dueCount > 0) {
    recommendations.push({
      title: `復習ドリル ${Math.min(dueCount, 5)}問`,
      reason: `${dueCount}問が復習期限です`,
      type: "review",
      estimatedMinutes: Math.ceil((dueCount * 50) / 60),
    });
  }

  // --- 遅い問題のチェック ---
  const slowCount = allProblems.filter((p) => {
    const a = latestAttempts.get(p.id);
    return a && a.isCorrect && a.timeMs > targetTimeForCategory(p.category) * 1000;
  }).length;
  if (slowCount > 0) {
    recommendations.push({
      title: `スピード強化 ${Math.min(slowCount, 3)}問`,
      reason: "正解だが目標時間を超過",
      type: "speed",
      estimatedMinutes: Math.ceil((Math.min(slowCount, 3) * 45) / 60),
    });
  }

  // --- カテゴリ別の弱点チェック ---
  const categoryAccuracy = new Map<string, { correct: number; total: number }>();
  for (const [, attempt] of latestAttempts) {
    const problem = allProblems.find((p) => p.id === attempt.problemId);
    if (!problem) continue;
    const entry = categoryAccuracy.get(problem.category) ?? {
      correct: 0,
      total: 0,
    };
    entry.total++;
    if (attempt.isCorrect) entry.correct++;
    categoryAccuracy.set(problem.category, entry);
  }

  // 最も正答率が低いカテゴリを特定
  let worstCategory: { category: string; accuracy: number } | null = null;
  for (const [category, stats] of categoryAccuracy) {
    if (stats.total < 3) continue; // 3問未満は除外
    const accuracy = stats.correct / stats.total;
    if (!worstCategory || accuracy < worstCategory.accuracy) {
      worstCategory = { category, accuracy };
    }
  }

  // 正答率70%未満のカテゴリがあればおすすめに追加
  if (worstCategory && worstCategory.accuracy < 0.7) {
    const catInfo =
      worstCategory.category === "table"
        ? "表"
        : worstCategory.category === "bar"
          ? "棒グラフ"
          : worstCategory.category === "pie"
            ? "円グラフ"
            : "複合";
    recommendations.push({
      title: `${catInfo}カテゴリ弱点 3問`,
      reason: `${catInfo}の正答率が${Math.round(worstCategory.accuracy * 100)}%`,
      type: "category_weak",
      estimatedMinutes: 3,
      category: worstCategory.category as Category,
    });
  }

  return recommendations;
}
