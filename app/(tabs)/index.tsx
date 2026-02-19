import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../src/constants/theme";
import { CATEGORIES, CATEGORY_MAP } from "../../src/constants/categories";
import { SAMPLE_PROBLEMS } from "../../src/db/sampleProblems";
import {
  getTodayStats,
  getAttemptsSince,
  getDueReviews,
  getActiveSession,
  getTestResults,
} from "../../src/db/database";
import {
  generateRecommendations,
  Recommendation,
} from "../../src/logic/sessionPicker";
import { Attempt, ReviewQueueItem, SessionState } from "../../src/types";

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState({
    questionsAnswered: 0,
    studyTimeMs: 0,
    correctCount: 0,
  });
  const [weeklyAccuracy, setWeeklyAccuracy] = useState<number | null>(null);
  const [weeklyAvgTime, setWeeklyAvgTime] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeSession, setActiveSession] = useState<SessionState | null>(null);
  const [lastTestInfo, setLastTestInfo] = useState<{
    correct: number;
    total: number;
    avgTimeSec: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const stats = await getTodayStats();
      setTodayStats(stats);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weeklyAttempts = await getAttemptsSince(sevenDaysAgo.toISOString());

      if (weeklyAttempts.length > 0) {
        const correctCount = weeklyAttempts.filter((a) => a.isCorrect).length;
        setWeeklyAccuracy(Math.round((correctCount / weeklyAttempts.length) * 100));
        const avgMs =
          weeklyAttempts.reduce((sum, a) => sum + a.timeMs, 0) /
          weeklyAttempts.length;
        setWeeklyAvgTime(Math.round(avgMs / 1000));
      }

      const dueReviews = await getDueReviews();
      const latestAttempts = new Map<string, Attempt>();
      for (const a of weeklyAttempts) {
        if (!latestAttempts.has(a.problemId)) {
          latestAttempts.set(a.problemId, a);
        }
      }
      const recs = generateRecommendations(
        SAMPLE_PROBLEMS,
        latestAttempts,
        dueReviews
      );
      setRecommendations(recs);

      const session = await getActiveSession();
      setActiveSession(session);

      const testResults = await getTestResults();
      if (testResults.length > 0) {
        const last = testResults[0];
        setLastTestInfo({
          correct: last.correctCount,
          total: last.totalQuestions,
          avgTimeSec: Math.round(last.averageTimeMs / 1000),
        });
      }
    } catch {
      // DB not ready yet on first load
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const startQuickSession = (seconds: number) => {
    router.push({
      pathname: "/question/[id]",
      params: { id: "quick", mode: "quick", duration: seconds.toString() },
    });
  };

  const startReviewSession = () => {
    router.push({
      pathname: "/question/[id]",
      params: { id: "quick", mode: "review" },
    });
  };

  const startSpeedSession = () => {
    router.push({
      pathname: "/question/[id]",
      params: { id: "quick", mode: "speed" },
    });
  };

  const resumeSession = () => {
    if (activeSession) {
      const currentProblemId =
        activeSession.problemIds[activeSession.currentIndex];
      router.push({
        pathname: "/question/[id]",
        params: { id: currentProblemId, mode: "resume", sessionId: activeSession.id },
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>GAB Study</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push("/settings")}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Resume Card (if active session) */}
        {activeSession && (
          <TouchableOpacity style={styles.resumeCard} onPress={resumeSession}>
            <View style={styles.resumeIcon}>
              <Ionicons name="play-circle" size={28} color={Colors.primary} />
            </View>
            <View style={styles.resumeContent}>
              <Text style={styles.resumeTitle}>続きから再開</Text>
              <Text style={styles.resumeSubtitle}>
                {activeSession.label ??
                  `問題 ${activeSession.currentIndex + 1}/${activeSession.problemIds.length}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* Quick Start */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>クイックスタート</Text>
          <View style={styles.quickButtonRow}>
            {[
              { label: "60秒", seconds: 60 },
              { label: "3分", seconds: 180 },
              { label: "5分", seconds: 300 },
            ].map((item) => (
              <TouchableOpacity
                key={item.seconds}
                style={styles.quickButton}
                onPress={() => startQuickSession(item.seconds)}
              >
                <Ionicons name="flash" size={20} color={Colors.primary} />
                <Text style={styles.quickButtonText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.actionButtonRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={startReviewSession}
            >
              <Ionicons
                name="refresh-circle-outline"
                size={18}
                color={Colors.warning}
              />
              <Text style={styles.actionButtonText}>
                復習だけ（期限/間違い）
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={startSpeedSession}
            >
              <Ionicons
                name="speedometer-outline"
                size={18}
                color={Colors.danger}
              />
              <Text style={styles.actionButtonText}>
                スピード強化（遅い問題）
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>今日のおすすめ</Text>
            {recommendations.map((rec, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recommendCard}
                onPress={() => {
                  if (rec.type === "review") startReviewSession();
                  else if (rec.type === "speed") startSpeedSession();
                  else startQuickSession(rec.estimatedMinutes * 60);
                }}
              >
                <View style={styles.recommendContent}>
                  <Text style={styles.recommendTitle}>{rec.title}</Text>
                  <Text style={styles.recommendReason}>{rec.reason}</Text>
                </View>
                <View style={styles.recommendAction}>
                  <Text style={styles.recommendTime}>
                    約{rec.estimatedMinutes}分
                  </Text>
                  <View style={styles.startBadge}>
                    <Text style={styles.startBadgeText}>START</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Progress Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>進捗</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {todayStats.questionsAnswered}
              </Text>
              <Text style={styles.statLabel}>今日の解答数</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {Math.round(todayStats.studyTimeMs / 60000)}分
              </Text>
              <Text style={styles.statLabel}>今日の学習</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {weeklyAccuracy != null ? `${weeklyAccuracy}%` : "--"}
              </Text>
              <Text style={styles.statLabel}>7日正答率</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {weeklyAvgTime != null ? `${weeklyAvgTime}秒` : "--"}
              </Text>
              <Text style={styles.statLabel}>平均時間</Text>
            </View>
          </View>
        </View>

        {/* Category Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>カテゴリ</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const count = SAMPLE_PROBLEMS.filter(
                (p) => p.category === cat.id
              ).length;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    { borderLeftColor: cat.color },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/learn",
                      params: { category: cat.id },
                    })
                  }
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={24}
                    color={cat.color}
                  />
                  <Text style={styles.categoryLabel}>{cat.labelShort}</Text>
                  <Text style={styles.categoryCount}>{count}問</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>管理</Text>
          <View style={styles.linkRow}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/learn",
                  params: { filter: "all" },
                })
              }
            >
              <Ionicons name="list-outline" size={18} color={Colors.text} />
              <Text style={styles.linkText}>問題一覧</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/learn",
                  params: { filter: "bookmarked" },
                })
              }
            >
              <Ionicons name="bookmark-outline" size={18} color={Colors.text} />
              <Text style={styles.linkText}>ブックマーク</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/learn",
                  params: { filter: "weak" },
                })
              }
            >
              <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
              <Text style={styles.linkText}>苦手だけ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mock Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>模試</Text>
          <TouchableOpacity
            style={styles.mockTestCard}
            onPress={() => router.push("/(tabs)/test")}
          >
            <View style={styles.mockTestContent}>
              <Text style={styles.mockTestTitle}>本番練習：20問/16分</Text>
              {lastTestInfo ? (
                <Text style={styles.mockTestSub}>
                  前回：{lastTestInfo.correct}/{lastTestInfo.total} 平均
                  {lastTestInfo.avgTimeSec}秒
                </Text>
              ) : (
                <Text style={styles.mockTestSub}>まだ受けていません</Text>
              )}
            </View>
            <View style={styles.startBadge}>
              <Text style={styles.startBadgeText}>START</Text>
            </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  appTitle: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.text,
  },
  settingsButton: {
    padding: Spacing.xs,
  },
  // Resume card
  resumeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  resumeIcon: {
    marginRight: Spacing.md,
  },
  resumeContent: {
    flex: 1,
  },
  resumeTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.primary,
  },
  resumeSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    marginTop: 2,
  },
  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  // Quick start
  quickButtonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  quickButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickButtonText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.primary,
  },
  actionButtonRow: {
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  // Recommendations
  recommendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recommendContent: {
    flex: 1,
  },
  recommendTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  recommendReason: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  recommendAction: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  recommendTime: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  startBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  startBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: "#fff",
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Categories
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  categoryCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    gap: Spacing.xs,
  },
  categoryLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  categoryCount: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  // Quick links
  linkRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  linkButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  // Mock test
  mockTestCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mockTestContent: {
    flex: 1,
  },
  mockTestTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  mockTestSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
