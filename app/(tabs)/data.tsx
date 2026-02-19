import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../src/constants/theme";
import { CATEGORIES, CATEGORY_MAP } from "../../src/constants/categories";
import { SAMPLE_PROBLEMS } from "../../src/db/sampleProblems";
import {
  getDailyStats,
  getAllAttempts,
  getTestResults,
} from "../../src/db/database";
import { DailyStats, Attempt, TestResult, Category } from "../../src/types";
import { targetTimeForCategory } from "../../src/logic/sessionPicker";

const SCREEN_WIDTH = Dimensions.get("window").width;

type TimePeriod = 7 | 30;

export default function DataScreen() {
  const [period, setPeriod] = useState<TimePeriod>(7);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [categoryData, setCategoryData] = useState<
    {
      category: Category;
      total: number;
      correct: number;
      accuracy: number;
      avgTimeMs: number;
    }[]
  >([]);
  const [slowProblems, setSlowProblems] = useState<
    { id: string; question: string; category: Category; timeMs: number }[]
  >([]);
  const [totalStats, setTotalStats] = useState({
    totalQuestions: 0,
    totalTimeMs: 0,
    correctCount: 0,
  });

  const loadData = useCallback(async () => {
    try {
      const stats = await getDailyStats(period);
      setDailyStats(stats);

      const attempts = await getAllAttempts();

      // Total stats for selected period
      const since = new Date();
      since.setDate(since.getDate() - period);
      const periodAttempts = attempts.filter(
        (a) => new Date(a.answeredAt) >= since
      );

      setTotalStats({
        totalQuestions: periodAttempts.length,
        totalTimeMs: periodAttempts.reduce((sum, a) => sum + a.timeMs, 0),
        correctCount: periodAttempts.filter((a) => a.isCorrect).length,
      });

      // Category breakdown
      const latestByProblem = new Map<string, Attempt>();
      for (const a of attempts) {
        if (!latestByProblem.has(a.problemId)) {
          latestByProblem.set(a.problemId, a);
        }
      }

      const catMap = new Map<
        Category,
        { total: number; correct: number; totalTimeMs: number }
      >();

      for (const [problemId, attempt] of latestByProblem) {
        const problem = SAMPLE_PROBLEMS.find((p) => p.id === problemId);
        if (!problem) continue;
        const cat = catMap.get(problem.category) ?? {
          total: 0,
          correct: 0,
          totalTimeMs: 0,
        };
        cat.total++;
        if (attempt.isCorrect) cat.correct++;
        cat.totalTimeMs += attempt.timeMs;
        catMap.set(problem.category, cat);
      }

      const catData = CATEGORIES.map((c) => {
        const d = catMap.get(c.id);
        return {
          category: c.id,
          total: d?.total ?? 0,
          correct: d?.correct ?? 0,
          accuracy: d && d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
          avgTimeMs: d && d.total > 0 ? Math.round(d.totalTimeMs / d.total) : 0,
        };
      });
      setCategoryData(catData);

      // Slow problems (correct but over target time)
      const slowList: typeof slowProblems = [];
      for (const [problemId, attempt] of latestByProblem) {
        const problem = SAMPLE_PROBLEMS.find((p) => p.id === problemId);
        if (!problem) continue;
        if (
          attempt.isCorrect &&
          attempt.timeMs > targetTimeForCategory(problem.category) * 1000
        ) {
          slowList.push({
            id: problemId,
            question: problem.question,
            category: problem.category,
            timeMs: attempt.timeMs,
          });
        }
      }
      slowList.sort((a, b) => b.timeMs - a.timeMs);
      setSlowProblems(slowList.slice(0, 10));
    } catch {
      // DB not ready
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const accuracy =
    totalStats.totalQuestions > 0
      ? Math.round((totalStats.correctCount / totalStats.totalQuestions) * 100)
      : 0;

  const avgTimeSec =
    totalStats.totalQuestions > 0
      ? Math.round(totalStats.totalTimeMs / totalStats.totalQuestions / 1000)
      : 0;

  const maxBarValue = Math.max(
    ...dailyStats.map((d) => d.questionsAnswered),
    1
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>データ</Text>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {([7, 30] as TimePeriod[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodChip,
                period === p && styles.periodChipActive,
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  styles.periodChipText,
                  period === p && styles.periodChipTextActive,
                ]}
              >
                {p}日間
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {Math.round(totalStats.totalTimeMs / 60000)}
            </Text>
            <Text style={styles.summaryUnit}>分</Text>
            <Text style={styles.summaryLabel}>学習時間</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalStats.totalQuestions}</Text>
            <Text style={styles.summaryUnit}>問</Text>
            <Text style={styles.summaryLabel}>解答数</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text
              style={[
                styles.summaryValue,
                { color: accuracy >= 70 ? Colors.success : Colors.danger },
              ]}
            >
              {accuracy}
            </Text>
            <Text style={styles.summaryUnit}>%</Text>
            <Text style={styles.summaryLabel}>正答率</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{avgTimeSec}</Text>
            <Text style={styles.summaryUnit}>秒</Text>
            <Text style={styles.summaryLabel}>平均時間</Text>
          </View>
        </View>

        {/* Daily Chart (simple bar chart) */}
        {dailyStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>日別解答数</Text>
            <View style={styles.chartContainer}>
              {dailyStats.map((day, i) => {
                const height =
                  (day.questionsAnswered / maxBarValue) * 100;
                const dayLabel = new Date(day.date).getDate().toString();
                return (
                  <View key={i} style={styles.chartBar}>
                    <View style={styles.chartBarWrapper}>
                      <View
                        style={[
                          styles.chartBarFill,
                          { height: `${Math.max(height, 2)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.chartBarLabel}>{dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>カテゴリ別成績</Text>
          {categoryData.map((cat) => {
            const catInfo = CATEGORY_MAP[cat.category];
            const targetMs = catInfo.targetTimeSec * 1000;
            const isOverTime = cat.avgTimeMs > targetMs && cat.total > 0;
            return (
              <View key={cat.category} style={styles.categoryRow}>
                <View
                  style={[
                    styles.categoryDot,
                    { backgroundColor: catInfo.color },
                  ]}
                />
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{catInfo.label}</Text>
                  <Text style={styles.categoryDetail}>
                    {cat.total}問解答 / {cat.correct}問正解
                  </Text>
                </View>
                <View style={styles.categoryStats}>
                  <Text
                    style={[
                      styles.categoryAccuracy,
                      {
                        color:
                          cat.accuracy >= 70
                            ? Colors.success
                            : cat.total > 0
                              ? Colors.danger
                              : Colors.textTertiary,
                      },
                    ]}
                  >
                    {cat.total > 0 ? `${cat.accuracy}%` : "--"}
                  </Text>
                  <Text
                    style={[
                      styles.categoryTime,
                      isOverTime && { color: Colors.danger },
                    ]}
                  >
                    {cat.total > 0
                      ? `${Math.round(cat.avgTimeMs / 1000)}秒`
                      : "--"}
                  </Text>
                </View>
                {/* Simple progress bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${cat.accuracy}%`,
                        backgroundColor:
                          cat.accuracy >= 70 ? Colors.success : Colors.danger,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Slow Problems */}
        {slowProblems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              遅い問題ランキング（正解だが時間超過）
            </Text>
            {slowProblems.map((sp, index) => (
              <View key={sp.id} style={styles.slowItem}>
                <Text style={styles.slowRank}>{index + 1}</Text>
                <View style={styles.slowContent}>
                  <Text style={styles.slowQuestion} numberOfLines={1}>
                    {sp.question}
                  </Text>
                  <Text style={styles.slowMeta}>
                    {CATEGORY_MAP[sp.category].labelShort} /{" "}
                    {Math.round(sp.timeMs / 1000)}秒
                    （目標: {targetTimeForCategory(sp.category)}秒）
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

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
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  // Period selector
  periodRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  periodChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
  },
  periodChipActive: {
    backgroundColor: Colors.primary,
  },
  periodChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  periodChipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  // Summary
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryValue: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text,
  },
  summaryUnit: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  // Section
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  // Chart
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    height: 160,
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartBar: {
    flex: 1,
    alignItems: "center",
  },
  chartBarWrapper: {
    flex: 1,
    width: "80%",
    justifyContent: "flex-end",
  },
  chartBarFill: {
    backgroundColor: Colors.primary,
    borderRadius: 2,
    width: "100%",
    minHeight: 2,
  },
  chartBarLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  // Category breakdown
  categoryRow: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
    top: Spacing.lg,
    left: Spacing.lg,
  },
  categoryInfo: {
    marginLeft: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  categoryName: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  categoryDetail: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  categoryStats: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginLeft: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  categoryAccuracy: {
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  categoryTime: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 2,
    marginLeft: Spacing.lg,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  // Slow problems
  slowItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  slowRank: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textTertiary,
    width: 24,
    textAlign: "center",
  },
  slowContent: {
    flex: 1,
  },
  slowQuestion: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  slowMeta: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    marginTop: 2,
  },
});
