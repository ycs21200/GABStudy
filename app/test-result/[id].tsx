import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../src/constants/theme";
import { CATEGORY_MAP } from "../../src/constants/categories";
import { getProblemById } from "../../src/db/sampleProblems";
import { getTestResults } from "../../src/db/database";
import { TestResult, CategoryScore } from "../../src/types";

// ===== テスト結果画面 =====
// テスト終了後に表示される結果サマリー
// スコア、正答率、カテゴリ別成績、個別回答を表示

export default function TestResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; data?: string }>();
  const [result, setResult] = useState<TestResult | null>(null);

  // --- 結果データの読み込み ---
  useEffect(() => {
    if (params.data) {
      try {
        setResult(JSON.parse(params.data));
      } catch {
        loadFromDB();
      }
    } else {
      loadFromDB();
    }
  }, [params.data, params.id]);

  const loadFromDB = async () => {
    try {
      const results = await getTestResults();
      const found = results.find((r) => r.id === params.id);
      if (found) setResult(found);
    } catch {
      // DB未準備
    }
  };

  if (!result) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>結果を読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const accuracy = Math.round(
    (result.correctCount / result.totalQuestions) * 100
  );
  const avgTimeSec = Math.round(result.averageTimeMs / 1000);

  // --- 成績判定 ---
  const getGrade = () => {
    if (accuracy >= 90) return { label: "S", color: "#FFD700" };
    if (accuracy >= 80) return { label: "A", color: Colors.success };
    if (accuracy >= 70) return { label: "B", color: Colors.primary };
    if (accuracy >= 60) return { label: "C", color: Colors.warning };
    return { label: "D", color: Colors.danger };
  };

  const grade = getGrade();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace("/(tabs)/test")}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>テスト結果</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* スコアカード */}
        <View style={styles.scoreCard}>
          <View style={[styles.gradeBadge, { backgroundColor: grade.color }]}>
            <Text style={styles.gradeText}>{grade.label}</Text>
          </View>
          <Text style={styles.scoreText}>
            {result.correctCount}
            <Text style={styles.scoreSeparator}> / </Text>
            {result.totalQuestions}
          </Text>
          <Text style={styles.accuracyText}>{accuracy}% 正答率</Text>
          <View style={styles.scoreMetaRow}>
            <View style={styles.scoreMeta}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.scoreMetaText}>平均 {avgTimeSec}秒/問</Text>
            </View>
          </View>
        </View>

        {/* カテゴリ別成績 */}
        {result.categoryBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>カテゴリ別</Text>
            {result.categoryBreakdown.map((cat) => {
              const catInfo = CATEGORY_MAP[cat.category];
              const catAccuracy =
                cat.total > 0
                  ? Math.round((cat.correct / cat.total) * 100)
                  : 0;
              return (
                <View key={cat.category} style={styles.categoryRow}>
                  <View
                    style={[styles.categoryDot, { backgroundColor: catInfo?.color ?? Colors.textTertiary }]}
                  />
                  <Text style={styles.categoryName}>
                    {catInfo?.label ?? cat.category}
                  </Text>
                  <Text style={styles.categoryScore}>
                    {cat.correct}/{cat.total}
                  </Text>
                  <Text
                    style={[
                      styles.categoryAccuracy,
                      {
                        color:
                          catAccuracy >= 70 ? Colors.success : Colors.danger,
                      },
                    ]}
                  >
                    {catAccuracy}%
                  </Text>
                  <Text style={styles.categoryTime}>
                    {Math.round(cat.averageTimeMs / 1000)}秒
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* 個別回答 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>回答詳細</Text>
          {result.answers.map((answer, index) => {
            const problem = getProblemById(answer.problemId);
            if (!problem) return null;

            return (
              <TouchableOpacity
                key={index}
                style={styles.answerRow}
                onPress={() =>
                  router.push({
                    pathname: "/question/[id]",
                    params: { id: answer.problemId, mode: "learn" },
                  })
                }
              >
                <View style={styles.answerIndex}>
                  <Text style={styles.answerIndexText}>{index + 1}</Text>
                </View>
                <Ionicons
                  name={
                    answer.isCorrect
                      ? "checkmark-circle"
                      : answer.selectedIndex === null
                        ? "remove-circle-outline"
                        : "close-circle"
                  }
                  size={20}
                  color={
                    answer.isCorrect
                      ? Colors.success
                      : answer.selectedIndex === null
                        ? Colors.textTertiary
                        : Colors.danger
                  }
                />
                <View style={styles.answerContent}>
                  <Text style={styles.answerQuestion} numberOfLines={1}>
                    {problem.question}
                  </Text>
                  <Text style={styles.answerMeta}>
                    {answer.selectedIndex !== null
                      ? `選択: ${problem.choices[answer.selectedIndex]?.label ?? "?"}`
                      : "未回答"}
                    {!answer.isCorrect &&
                      answer.selectedIndex !== null &&
                      ` → 正解: ${problem.choices[problem.correctIndex]?.label}`}
                    {answer.timeMs > 0 &&
                      ` / ${Math.round(answer.timeMs / 1000)}秒`}
                  </Text>
                </View>
                {answer.flagged && (
                  <Ionicons name="flag" size={14} color={Colors.warning} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* アクションボタン */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => router.replace("/(tabs)/test")}
          >
            <Text style={styles.primaryActionText}>テスト一覧に戻る</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.secondaryActionText}>ホームに戻る</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  content: {
    paddingHorizontal: Spacing.lg,
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
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text,
  },
  // スコアカード
  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: "center",
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gradeBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  gradeText: {
    fontSize: FontSize.xxl,
    fontWeight: "900",
    color: "#fff",
  },
  scoreText: {
    fontSize: 40,
    fontWeight: "700",
    color: Colors.text,
  },
  scoreSeparator: {
    fontSize: FontSize.xl,
    color: Colors.textTertiary,
  },
  accuracyText: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  scoreMetaRow: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginTop: Spacing.md,
  },
  scoreMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  scoreMetaText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  // セクション
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  // カテゴリ行
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  categoryScore: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  categoryAccuracy: {
    fontSize: FontSize.md,
    fontWeight: "700",
    width: 40,
    textAlign: "right",
  },
  categoryTime: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    width: 36,
    textAlign: "right",
  },
  // 回答詳細
  answerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  answerIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  answerIndexText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  answerContent: {
    flex: 1,
  },
  answerQuestion: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  answerMeta: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // アクション
  actionRow: {
    gap: Spacing.sm,
  },
  primaryAction: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  primaryActionText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: "#fff",
  },
  secondaryAction: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  secondaryActionText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
});
