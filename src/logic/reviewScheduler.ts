// ===================================================
// GAB Study 間隔反復スケジューラ
// 解答結果に基づき、次回復習日を自動計算する
// アルゴリズム: 簡易的なLeitnerシステム
// ===================================================

import { ReviewQueueItem } from "../types";
import { REVIEW_INTERVALS_DAYS } from "../constants/categories";

// ===== 復習スケジュール計算 =====

/**
 * 解答後の復習スケジュールを更新する
 *
 * - 正解: ステージを1つ進める（復習間隔が延びる）
 * - 不正解: ステージを1つ戻す（復習間隔が縮まる、最低0）
 *
 * ステージと間隔の対応:
 *   0 → 1日後
 *   1 → 3日後
 *   2 → 7日後
 *   3 → 14日後
 *   4 → 30日後
 *
 * @param problemId 問題ID
 * @param isCorrect 正解かどうか
 * @param currentItem 現在の復習アイテム（初回はnull）
 */
export function computeNextReview(
  problemId: string,
  isCorrect: boolean,
  currentItem: ReviewQueueItem | null
): ReviewQueueItem {
  const currentStage = currentItem?.stage ?? 0;
  let newStage: number;

  if (isCorrect) {
    // 正解: ステージを上げる（間隔延長）
    newStage = currentStage + 1;
  } else {
    // 不正解: ステージを下げる（間隔短縮）
    newStage = Math.max(currentStage - 1, 0);
  }

  // ステージに応じた次回復習日を計算
  const intervalIndex = Math.min(newStage, REVIEW_INTERVALS_DAYS.length - 1);
  const intervalDays = REVIEW_INTERVALS_DAYS[intervalIndex];

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);

  return {
    problemId,
    nextReviewAt: nextReview.toISOString(),
    stage: newStage,
  };
}

// ===== 復習状態チェック =====

/** 復習期限が来ているか判定 */
export function isReviewDue(item: ReviewQueueItem): boolean {
  return new Date(item.nextReviewAt) <= new Date();
}

// ===== 表示用ユーティリティ =====

/** ステージに対応する間隔を日本語ラベルで返す */
export function getIntervalLabel(stage: number): string {
  const index = Math.min(stage, REVIEW_INTERVALS_DAYS.length - 1);
  const days = REVIEW_INTERVALS_DAYS[index];
  if (days === 1) return "明日";
  if (days < 7) return `${days}日後`;
  if (days === 7) return "1週間後";
  if (days === 14) return "2週間後";
  return `${days}日後`;
}
