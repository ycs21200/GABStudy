import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../src/constants/theme";
import { CATEGORY_MAP } from "../../src/constants/categories";
import { getProblemById } from "../../src/db/sampleProblems";
import {
  saveAttempt,
  saveTestResult,
  upsertReviewItem,
} from "../../src/db/database";
import { computeNextReview } from "../../src/logic/reviewScheduler";
import { useCountdownTimer } from "../../src/hooks/useCountdownTimer";
import {
  Problem,
  Attempt,
  SessionAnswer,
  TestResult,
  CategoryScore,
  Category,
} from "../../src/types";

// ===== テストセッション画面 =====
// 模試・カスタムテスト実行中の画面
// カウントダウンタイマー、問題番号表示、旗(見直し)機能を含む

export default function TestSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    problemIds: string;
    timeLimit: string;
    label: string;
  }>();

  // --- 状態管理 ---
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const timeLimitMs = parseInt(params.timeLimit ?? "960", 10) * 1000;

  // --- カウントダウンタイマー ---
  const countdown = useCountdownTimer(timeLimitMs, () => {
    handleTimeUp();
  });

  // --- 問題の初期化 ---
  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(params.problemIds ?? "[]");
      const probs = ids.map(getProblemById).filter(Boolean) as Problem[];
      setProblems(probs);
      setAnswers(
        probs.map((p) => ({
          problemId: p.id,
          selectedIndex: null,
          isCorrect: null,
          timeMs: 0,
          flagged: false,
        }))
      );
      countdown.start();
    } catch {
      router.back();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentProblem = problems[currentIndex];

  // --- 選択肢タップ（即確定モード）---
  const handleSelectChoice = (index: number) => {
    setSelectedChoice(index);
    const timeMs = Date.now() - questionStartTime;
    const isCorrect = currentProblem
      ? index === currentProblem.correctIndex
      : false;

    // 解答を記録
    setAnswers((prev) => {
      const updated = [...prev];
      if (updated[currentIndex]) {
        updated[currentIndex] = {
          ...updated[currentIndex],
          selectedIndex: index,
          isCorrect,
          timeMs,
        };
      }
      return updated;
    });

    // 自動的に次の問題へ（少しの遅延で選択を確認）
    setTimeout(() => {
      if (currentIndex < problems.length - 1) {
        goToQuestion(currentIndex + 1);
      }
    }, 300);
  };

  // --- 問題間の移動 ---
  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
    setSelectedChoice(null);
    setQuestionStartTime(Date.now());
  };

  // --- 旗（見直しマーク）---
  const toggleFlag = () => {
    setAnswers((prev) => {
      const updated = [...prev];
      if (updated[currentIndex]) {
        updated[currentIndex] = {
          ...updated[currentIndex],
          flagged: !updated[currentIndex].flagged,
        };
      }
      return updated;
    });
  };

  // --- 時間切れ処理 ---
  const handleTimeUp = () => {
    Alert.alert("時間切れ", "制限時間になりました。結果を確認しましょう。", [
      { text: "結果を見る", onPress: () => finishTest() },
    ]);
  };

  // --- テスト終了処理 ---
  const handleFinish = () => {
    const unanswered = answers.filter((a) => a.selectedIndex === null).length;
    if (unanswered > 0) {
      Alert.alert(
        "未回答があります",
        `${unanswered}問が未回答です。テストを終了しますか？`,
        [
          { text: "戻る", style: "cancel" },
          { text: "終了する", onPress: () => finishTest() },
        ]
      );
    } else {
      finishTest();
    }
  };

  // --- 結果の保存と画面遷移 ---
  const finishTest = async () => {
    countdown.pause();

    // 各問題の解答をDBに保存
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const problem = problems[i];
      if (!problem || answer.selectedIndex === null) continue;

      const attempt: Attempt = {
        id: `${problem.id}-test-${Date.now()}-${i}`,
        problemId: problem.id,
        answeredAt: new Date().toISOString(),
        isCorrect: answer.isCorrect ?? false,
        selectedIndex: answer.selectedIndex,
        timeMs: answer.timeMs,
      };

      try {
        await saveAttempt(attempt);
        // 復習キューも更新
        const reviewItem = computeNextReview(
          problem.id,
          answer.isCorrect ?? false,
          null
        );
        await upsertReviewItem(reviewItem);
      } catch {
        // 保存エラーは無視
      }
    }

    // カテゴリ別集計
    const categoryMap = new Map<
      Category,
      { total: number; correct: number; totalTimeMs: number }
    >();
    for (let i = 0; i < answers.length; i++) {
      const problem = problems[i];
      const answer = answers[i];
      if (!problem) continue;

      const cat = categoryMap.get(problem.category) ?? {
        total: 0,
        correct: 0,
        totalTimeMs: 0,
      };
      cat.total++;
      if (answer.isCorrect) cat.correct++;
      cat.totalTimeMs += answer.timeMs;
      categoryMap.set(problem.category, cat);
    }

    const categoryBreakdown: CategoryScore[] = Array.from(
      categoryMap.entries()
    ).map(([category, stats]) => ({
      category,
      total: stats.total,
      correct: stats.correct,
      averageTimeMs:
        stats.total > 0 ? Math.round(stats.totalTimeMs / stats.total) : 0,
    }));

    const correctCount = answers.filter((a) => a.isCorrect).length;
    const answeredCount = answers.filter(
      (a) => a.selectedIndex !== null
    ).length;
    const totalTimeMs = answers.reduce((sum, a) => sum + a.timeMs, 0);

    // テスト結果を保存
    const resultId = `test-${Date.now()}`;
    const testResult: TestResult = {
      id: resultId,
      sessionId: resultId,
      completedAt: new Date().toISOString(),
      totalQuestions: problems.length,
      correctCount,
      averageTimeMs:
        answeredCount > 0 ? Math.round(totalTimeMs / answeredCount) : 0,
      categoryBreakdown,
      answers,
    };

    try {
      await saveTestResult(testResult);
    } catch {
      // 保存エラーは無視
    }

    // 結果画面へ遷移
    router.replace({
      pathname: "/test-result/[id]",
      params: { id: resultId, data: JSON.stringify(testResult) },
    });
  };

  if (!currentProblem) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>テストを準備中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentAnswer = answers[currentIndex];
  const categoryInfo = CATEGORY_MAP[currentProblem.category];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* ヘッダー：残り時間と問題番号 */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("テストを中断", "中断しますか？", [
                { text: "続ける", style: "cancel" },
                {
                  text: "中断する",
                  style: "destructive",
                  onPress: () => router.back(),
                },
              ])
            }
          >
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={16} color={countdown.isExpired ? Colors.danger : Colors.text} />
            <Text
              style={[
                styles.timerText,
                countdown.isExpired && { color: Colors.danger },
              ]}
            >
              {countdown.formatted}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={toggleFlag}>
              <Ionicons
                name={currentAnswer?.flagged ? "flag" : "flag-outline"}
                size={22}
                color={currentAnswer?.flagged ? Colors.warning : Colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 問題番号ナビゲーション */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.questionNav}
          contentContainerStyle={styles.questionNavContent}
        >
          {problems.map((_, i) => {
            const answer = answers[i];
            const isAnswered = answer?.selectedIndex !== null;
            const isCurrent = i === currentIndex;
            const isFlagged = answer?.flagged;

            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.questionNavItem,
                  isCurrent && styles.questionNavCurrent,
                  isAnswered && !isCurrent && styles.questionNavAnswered,
                ]}
                onPress={() => goToQuestion(i)}
              >
                <Text
                  style={[
                    styles.questionNavText,
                    (isCurrent || isAnswered) && styles.questionNavTextActive,
                  ]}
                >
                  {i + 1}
                </Text>
                {isFlagged && (
                  <View style={styles.flagDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 問題内容 */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
        >
          {/* 図表プレースホルダー */}
          <View style={styles.placeholderChart}>
            <Ionicons
              name={categoryInfo?.icon as any ?? "image-outline"}
              size={40}
              color={Colors.textTertiary}
            />
            <Text style={styles.placeholderText}>図表エリア</Text>
          </View>

          {/* 設問 */}
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>{currentProblem.question}</Text>
          </View>

          {/* 選択肢 */}
          <View style={styles.choicesContainer}>
            {currentProblem.choices.map((choice, index) => {
              const isSelected =
                currentAnswer?.selectedIndex === index ||
                selectedChoice === index;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.choiceButton,
                    isSelected && styles.choiceSelected,
                  ]}
                  onPress={() => handleSelectChoice(index)}
                >
                  <View
                    style={[
                      styles.choiceLabel,
                      isSelected && styles.choiceLabelSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceLabelText,
                        isSelected && styles.choiceLabelTextActive,
                      ]}
                    >
                      {choice.label}
                    </Text>
                  </View>
                  <Text style={styles.choiceText}>{choice.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* 下部ナビゲーション */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[
              styles.navButton,
              currentIndex === 0 && styles.navButtonDisabled,
            ]}
            onPress={() => currentIndex > 0 && goToQuestion(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={currentIndex === 0 ? Colors.textTertiary : Colors.text}
            />
            <Text
              style={[
                styles.navButtonText,
                currentIndex === 0 && styles.navButtonTextDisabled,
              ]}
            >
              前へ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.finishButton}
            onPress={handleFinish}
          >
            <Text style={styles.finishButtonText}>テスト終了</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              currentIndex >= problems.length - 1 && styles.navButtonDisabled,
            ]}
            onPress={() =>
              currentIndex < problems.length - 1 &&
              goToQuestion(currentIndex + 1)
            }
            disabled={currentIndex >= problems.length - 1}
          >
            <Text
              style={[
                styles.navButtonText,
                currentIndex >= problems.length - 1 &&
                  styles.navButtonTextDisabled,
              ]}
            >
              次へ
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={
                currentIndex >= problems.length - 1
                  ? Colors.textTertiary
                  : Colors.text
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  // ヘッダー
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  timerText: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
  headerRight: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  // 問題番号ナビ
  questionNav: {
    maxHeight: 44,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  questionNavContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  questionNavItem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  questionNavCurrent: {
    backgroundColor: Colors.primary,
  },
  questionNavAnswered: {
    backgroundColor: Colors.primaryLight,
  },
  questionNavText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  questionNavTextActive: {
    color: "#fff",
  },
  flagDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  // コンテンツ
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: Spacing.lg,
  },
  placeholderChart: {
    width: "100%",
    height: 160,
    marginVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  placeholderText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  questionContainer: {
    marginBottom: Spacing.lg,
  },
  questionText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 24,
  },
  choicesContainer: {
    gap: Spacing.sm,
  },
  choiceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  choiceSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  choiceLabel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  choiceLabelSelected: {
    backgroundColor: Colors.primary,
  },
  choiceLabelText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  choiceLabelTextActive: {
    color: "#fff",
  },
  choiceText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  // 下部ナビ
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: 28,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  navButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  finishButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  finishButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: "#fff",
  },
});
