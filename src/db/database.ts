// ===================================================
// GAB Study データベース操作
// SQLiteを使用したローカルデータ永続化レイヤー
// テーブル: attempts, review_queue, problem_notes,
//          session_state, test_results, settings
// ===================================================

import * as SQLite from "expo-sqlite";
import {
  Attempt,
  ReviewQueueItem,
  ProblemNote,
  SessionState,
  TestResult,
  AppSettings,
  DailyStats,
  CategoryStats,
  Category,
} from "../types";

/** データベースのシングルトンインスタンス */
let db: SQLite.SQLiteDatabase | null = null;

/** データベース接続を取得（初回はテーブル作成も実行） */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("gabstudy.db");
  await initializeTables(db);
  return db;
}

async function initializeTables(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      problemId TEXT NOT NULL,
      answeredAt TEXT NOT NULL,
      isCorrect INTEGER NOT NULL,
      selectedIndex INTEGER NOT NULL,
      timeMs INTEGER NOT NULL,
      calcHistory TEXT
    );

    CREATE TABLE IF NOT EXISTS review_queue (
      problemId TEXT PRIMARY KEY,
      nextReviewAt TEXT NOT NULL,
      stage INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS problem_notes (
      problemId TEXT PRIMARY KEY,
      bookmarked INTEGER NOT NULL DEFAULT 0,
      tags TEXT NOT NULL DEFAULT '[]',
      memo TEXT NOT NULL DEFAULT '',
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_state (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_results (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      completedAt TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_attempts_problem ON attempts(problemId);
    CREATE INDEX IF NOT EXISTS idx_attempts_date ON attempts(answeredAt);
    CREATE INDEX IF NOT EXISTS idx_review_next ON review_queue(nextReviewAt);
  `);
}

// ===== 解答ログ操作 =====

/** 解答記録を保存 */
export async function saveAttempt(attempt: Attempt): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO attempts (id, problemId, answeredAt, isCorrect, selectedIndex, timeMs, calcHistory)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    attempt.id,
    attempt.problemId,
    attempt.answeredAt,
    attempt.isCorrect ? 1 : 0,
    attempt.selectedIndex,
    attempt.timeMs,
    attempt.calcHistory ?? null
  );
}

export async function getLatestAttemptForProblem(
  problemId: string
): Promise<Attempt | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    problemId: string;
    answeredAt: string;
    isCorrect: number;
    selectedIndex: number;
    timeMs: number;
    calcHistory: string | null;
  }>(
    `SELECT * FROM attempts WHERE problemId = ? ORDER BY answeredAt DESC LIMIT 1`,
    problemId
  );
  if (!row) return null;
  return {
    ...row,
    isCorrect: row.isCorrect === 1,
    calcHistory: row.calcHistory ?? undefined,
  };
}

export async function getAttemptsForProblem(
  problemId: string
): Promise<Attempt[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    problemId: string;
    answeredAt: string;
    isCorrect: number;
    selectedIndex: number;
    timeMs: number;
    calcHistory: string | null;
  }>(`SELECT * FROM attempts WHERE problemId = ? ORDER BY answeredAt DESC`, problemId);
  return rows.map((row) => ({
    ...row,
    isCorrect: row.isCorrect === 1,
    calcHistory: row.calcHistory ?? undefined,
  }));
}

export async function getAllAttempts(): Promise<Attempt[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    problemId: string;
    answeredAt: string;
    isCorrect: number;
    selectedIndex: number;
    timeMs: number;
    calcHistory: string | null;
  }>(`SELECT * FROM attempts ORDER BY answeredAt DESC`);
  return rows.map((row) => ({
    ...row,
    isCorrect: row.isCorrect === 1,
    calcHistory: row.calcHistory ?? undefined,
  }));
}

export async function getAttemptsSince(sinceDate: string): Promise<Attempt[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    problemId: string;
    answeredAt: string;
    isCorrect: number;
    selectedIndex: number;
    timeMs: number;
    calcHistory: string | null;
  }>(`SELECT * FROM attempts WHERE answeredAt >= ? ORDER BY answeredAt DESC`, sinceDate);
  return rows.map((row) => ({
    ...row,
    isCorrect: row.isCorrect === 1,
    calcHistory: row.calcHistory ?? undefined,
  }));
}

// ===== 復習キュー操作 =====

/** 全復習アイテムを取得 */
export async function getReviewQueue(): Promise<ReviewQueueItem[]> {
  const database = await getDatabase();
  return database.getAllAsync<ReviewQueueItem>(
    `SELECT * FROM review_queue ORDER BY nextReviewAt ASC`
  );
}

export async function getDueReviews(): Promise<ReviewQueueItem[]> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  return database.getAllAsync<ReviewQueueItem>(
    `SELECT * FROM review_queue WHERE nextReviewAt <= ? ORDER BY nextReviewAt ASC`,
    now
  );
}

export async function upsertReviewItem(item: ReviewQueueItem): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO review_queue (problemId, nextReviewAt, stage) VALUES (?, ?, ?)`,
    item.problemId,
    item.nextReviewAt,
    item.stage
  );
}

// ===== ブックマーク・メモ操作 =====

/** 問題のメモ情報を取得 */
export async function getProblemNote(
  problemId: string
): Promise<ProblemNote | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    problemId: string;
    bookmarked: number;
    tags: string;
    memo: string;
    updatedAt: string;
  }>(`SELECT * FROM problem_notes WHERE problemId = ?`, problemId);
  if (!row) return null;
  return {
    ...row,
    bookmarked: row.bookmarked === 1,
    tags: JSON.parse(row.tags),
  };
}

export async function saveProblemNote(note: ProblemNote): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO problem_notes (problemId, bookmarked, tags, memo, updatedAt) VALUES (?, ?, ?, ?, ?)`,
    note.problemId,
    note.bookmarked ? 1 : 0,
    JSON.stringify(note.tags),
    note.memo,
    note.updatedAt
  );
}

export async function getBookmarkedProblemIds(): Promise<string[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ problemId: string }>(
    `SELECT problemId FROM problem_notes WHERE bookmarked = 1`
  );
  return rows.map((r) => r.problemId);
}

// ===== セッション状態（途中再開用）=====

/** セッション状態を保存 */
export async function saveSessionState(
  session: SessionState
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO session_state (id, data) VALUES (?, ?)`,
    session.id,
    JSON.stringify(session)
  );
}

export async function getActiveSession(): Promise<SessionState | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ id: string; data: string }>(
    `SELECT * FROM session_state ORDER BY rowid DESC LIMIT 1`
  );
  if (!row) return null;
  return JSON.parse(row.data);
}

export async function clearSession(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM session_state WHERE id = ?`, id);
}

// ===== テスト結果操作 =====

/** テスト結果を保存 */
export async function saveTestResult(result: TestResult): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO test_results (id, sessionId, completedAt, data) VALUES (?, ?, ?, ?)`,
    result.id,
    result.sessionId,
    result.completedAt,
    JSON.stringify(result)
  );
}

export async function getTestResults(): Promise<TestResult[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    sessionId: string;
    completedAt: string;
    data: string;
  }>(`SELECT * FROM test_results ORDER BY completedAt DESC`);
  return rows.map((r) => JSON.parse(r.data));
}

// ===== アプリ設定操作 =====

/** デフォルト設定値 */
const DEFAULT_SETTINGS: AppSettings = {
  timerVisible: true,
  timerPosition: "top-right",
  timerShowDigits: true,
  targetTimeSec: 45,
  learningMode: "focus",
  offlineMode: "all",
  resumeTimerBehavior: "continue",
};

export async function getSettings(): Promise<AppSettings> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ key: string; value: string }>(
    `SELECT * FROM settings WHERE key = 'app_settings'`
  );
  if (!row) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ('app_settings', ?)`,
    JSON.stringify(settings)
  );
}

// ===== 統計クエリ =====

/** 指定日数分の日別統計を取得 */
export async function getDailyStats(days: number): Promise<DailyStats[]> {
  const database = await getDatabase();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = await database.getAllAsync<{
    date: string;
    questionsAnswered: number;
    studyTimeMs: number;
    correctCount: number;
  }>(
    `SELECT
       DATE(answeredAt) as date,
       COUNT(*) as questionsAnswered,
       SUM(timeMs) as studyTimeMs,
       SUM(CASE WHEN isCorrect = 1 THEN 1 ELSE 0 END) as correctCount
     FROM attempts
     WHERE answeredAt >= ?
     GROUP BY DATE(answeredAt)
     ORDER BY date ASC`,
    since.toISOString()
  );
  return rows;
}

export async function getCategoryStats(): Promise<CategoryStats[]> {
  const database = await getDatabase();
  // We need to join with problem data - but since problems are in-memory,
  // we'll compute this in the logic layer instead
  return [];
}

export async function getTodayStats(): Promise<{
  questionsAnswered: number;
  studyTimeMs: number;
  correctCount: number;
}> {
  const database = await getDatabase();
  const today = new Date().toISOString().split("T")[0];
  const row = await database.getFirstAsync<{
    questionsAnswered: number;
    studyTimeMs: number;
    correctCount: number;
  }>(
    `SELECT
       COUNT(*) as questionsAnswered,
       COALESCE(SUM(timeMs), 0) as studyTimeMs,
       SUM(CASE WHEN isCorrect = 1 THEN 1 ELSE 0 END) as correctCount
     FROM attempts
     WHERE DATE(answeredAt) = ?`,
    today
  );
  return row ?? { questionsAnswered: 0, studyTimeMs: 0, correctCount: 0 };
}

// ===== データリセット =====

/** 学習データを全削除（解答ログ・復習キュー・メモ・セッション） */
export async function resetLearningData(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM attempts;
    DELETE FROM review_queue;
    DELETE FROM problem_notes;
    DELETE FROM session_state;
  `);
}

export async function resetTestHistory(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`DELETE FROM test_results;`);
}
