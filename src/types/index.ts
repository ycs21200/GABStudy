// ===================================================
// GAB Study アプリ 型定義
// アプリ全体で使用するインターフェースと型を集約
// ===================================================

// ===== 問題とカテゴリ =====

/** 学習カテゴリ: 表/棒グラフ/円グラフ/複合 */
export type Category = "table" | "bar" | "pie" | "composite";

/** 難易度: ★1〜★3 */
export type Difficulty = 1 | 2 | 3;

/** 苦手タグ: 間違いの原因分類 */
export type MistakeTag =
  | "unit"          // 単位ミス
  | "ratio"         // 割合ミス
  | "oversight"     // 見落とし
  | "estimation"    // 概算ミス
  | "time_pressure" // 時間不足
  | "misread";      // 読み違い

/** 問題データ */
export interface Problem {
  id: string;
  category: Category;
  difficulty: Difficulty;
  /** 設問文 */
  question: string;
  /** 図表画像のURI（空文字の場合はプレースホルダー表示） */
  imageUri: string;
  /** 選択肢リスト（通常5つ） */
  choices: Choice[];
  /** 正解の選択肢インデックス */
  correctIndex: number;
  /** ステップ式解説 */
  explanation: ExplanationStep[];
  /** よくあるミスの説明 */
  commonMistakes: string[];
  /** このカテゴリの目標解答時間（秒） */
  targetTimeSec: number;
}

/** 選択肢 */
export interface Choice {
  label: string; // "A", "B", "C", "D", "E"
  text: string;  // 選択肢テキスト
}

/** 解説のステップ */
export interface ExplanationStep {
  label: string;   // 例: "Step 1", "答え"
  content: string; // 解説内容
}

// ===== 学習ログ =====

/** 解答記録（1問ごとの解答情報） */
export interface Attempt {
  id: string;
  problemId: string;
  /** 解答日時（ISO形式） */
  answeredAt: string;
  isCorrect: boolean;
  /** 選択した選択肢のインデックス */
  selectedIndex: number;
  /** 解答にかかった時間（ミリ秒） */
  timeMs: number;
  /** 計算メモの履歴（JSON文字列） */
  calcHistory?: string;
}

// ===== 復習キュー（間隔反復） =====

/** 復習スケジュールアイテム */
export interface ReviewQueueItem {
  problemId: string;
  /** 次回復習予定日（ISO形式） */
  nextReviewAt: string;
  /** 反復ステージ: 0=1日後, 1=3日後, 2=7日後, 3=14日後, 4=30日後 */
  stage: number;
}

// ===== ブックマーク・メモ =====

/** 問題に対するユーザーのメモ情報 */
export interface ProblemNote {
  problemId: string;
  bookmarked: boolean;
  /** 苦手原因タグ */
  tags: MistakeTag[];
  /** 一言メモ（20〜30文字推奨） */
  memo: string;
  updatedAt: string;
}

// ===== セッション状態（途中再開対応） =====

/** 学習セッションの保存状態 */
export interface SessionState {
  id: string;
  /** セッション種別: クイック/テスト/カテゴリ別 */
  type: "quick" | "test" | "category";
  /** セッション内の問題IDリスト */
  problemIds: string[];
  /** 現在の問題インデックス */
  currentIndex: number;
  /** 各問題の解答状態 */
  answers: SessionAnswer[];
  /** セッション開始日時 */
  startedAt: string;
  /** 経過時間（ミリ秒） */
  elapsedMs: number;
  /** テストモード時の制限時間（秒） */
  timeLimitSec?: number;
  /** 表示ラベル */
  label?: string;
}

/** セッション内の1問の解答状態 */
export interface SessionAnswer {
  problemId: string;
  /** 選択肢インデックス（未回答はnull） */
  selectedIndex: number | null;
  isCorrect: boolean | null;
  timeMs: number;
  /** 見直しフラグ */
  flagged: boolean;
}

// ===== テスト結果 =====

/** テスト結果の保存データ */
export interface TestResult {
  id: string;
  sessionId: string;
  completedAt: string;
  totalQuestions: number;
  correctCount: number;
  /** 1問あたりの平均解答時間（ミリ秒） */
  averageTimeMs: number;
  /** カテゴリ別スコア */
  categoryBreakdown: CategoryScore[];
  /** 各問題の解答 */
  answers: SessionAnswer[];
}

/** カテゴリ別のスコア集計 */
export interface CategoryScore {
  category: Category;
  total: number;
  correct: number;
  averageTimeMs: number;
}

// ===== アプリ設定 =====

/** ユーザー設定 */
export interface AppSettings {
  /** タイマー表示ON/OFF */
  timerVisible: boolean;
  /** タイマー表示位置 */
  timerPosition: "top-right" | "top-left";
  /** タイマーに数字を表示するか */
  timerShowDigits: boolean;
  /** 目標解答時間（秒） */
  targetTimeSec: number;
  /** 学習モード: 集中/練習 */
  learningMode: "focus" | "practice";
  /** オフラインモード: 全問題DL/必要時DL */
  offlineMode: "all" | "on-demand";
  /** 再開時のタイマー動作: 継続/リセット */
  resumeTimerBehavior: "continue" | "reset";
}

// ===== ナビゲーション =====

/** クイックセッション時間（秒） */
export type QuickSessionDuration = 60 | 180 | 300;

/** クイックセッション種別 */
export type QuickSessionType = "timed" | "review" | "speed";

// ===== 統計データ =====

/** 日別統計 */
export interface DailyStats {
  date: string;
  /** 解答数 */
  questionsAnswered: number;
  /** 学習時間（ミリ秒） */
  studyTimeMs: number;
  /** 正解数 */
  correctCount: number;
}

/** カテゴリ別統計 */
export interface CategoryStats {
  category: Category;
  totalAttempts: number;
  correctCount: number;
  averageTimeMs: number;
  /** 正答率（0〜1） */
  accuracy: number;
}
