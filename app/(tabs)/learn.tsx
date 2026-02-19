import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../src/constants/theme";
import { CATEGORIES, CategoryInfo, CATEGORY_MAP } from "../../src/constants/categories";
import { SAMPLE_PROBLEMS, getProblemsByCategory } from "../../src/db/sampleProblems";
import {
  getLatestAttemptForProblem,
  getBookmarkedProblemIds,
  getAllAttempts,
} from "../../src/db/database";
import { Problem, Attempt, Category } from "../../src/types";

type FilterType = "all" | "unseen" | "wrong" | "correct" | "bookmarked" | "weak";
type SortType = "default" | "difficulty" | "time";

export default function LearnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; filter?: string }>();

  const [selectedCategory, setSelectedCategory] = useState<Category | "all">(
    (params.category as Category) ?? "all"
  );
  const [filter, setFilter] = useState<FilterType>(
    (params.filter as FilterType) ?? "all"
  );
  const [problemStatuses, setProblemStatuses] = useState<
    Map<string, { isCorrect: boolean; timeMs: number }>
  >(new Map());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const loadStatuses = useCallback(async () => {
    try {
      const attempts = await getAllAttempts();
      const statusMap = new Map<string, { isCorrect: boolean; timeMs: number }>();
      for (const a of attempts) {
        if (!statusMap.has(a.problemId)) {
          statusMap.set(a.problemId, { isCorrect: a.isCorrect, timeMs: a.timeMs });
        }
      }
      setProblemStatuses(statusMap);

      const bIds = await getBookmarkedProblemIds();
      setBookmarkedIds(new Set(bIds));
    } catch {
      // DB not ready
    }
  }, []);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  // Filter and sort problems
  const filteredProblems = SAMPLE_PROBLEMS.filter((p) => {
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;

    const status = problemStatuses.get(p.id);
    switch (filter) {
      case "unseen":
        return !status;
      case "wrong":
        return status && !status.isCorrect;
      case "correct":
        return status?.isCorrect;
      case "bookmarked":
        return bookmarkedIds.has(p.id);
      case "weak":
        if (!status) return false;
        const cat = CATEGORY_MAP[p.category];
        return !status.isCorrect || status.timeMs > cat.targetTimeSec * 1000;
      default:
        return true;
    }
  });

  const getCategoryStats = (category: Category) => {
    const problems = getProblemsByCategory(category);
    const attempted = problems.filter((p) => problemStatuses.has(p.id));
    const correct = problems.filter((p) => problemStatuses.get(p.id)?.isCorrect);
    return {
      total: problems.length,
      attempted: attempted.length,
      correct: correct.length,
      accuracy:
        attempted.length > 0
          ? Math.round((correct.length / attempted.length) * 100)
          : null,
    };
  };

  const getStatusIcon = (problemId: string) => {
    const status = problemStatuses.get(problemId);
    if (!status) return { name: "ellipse-outline" as const, color: Colors.textTertiary };
    if (status.isCorrect) return { name: "checkmark-circle" as const, color: Colors.success };
    return { name: "close-circle" as const, color: Colors.danger };
  };

  const getDifficultyStars = (difficulty: number) => {
    return "★".repeat(difficulty) + "☆".repeat(3 - difficulty);
  };

  const renderProblemItem = ({ item: problem }: { item: Problem }) => {
    const statusIcon = getStatusIcon(problem.id);
    const status = problemStatuses.get(problem.id);
    const isBookmarked = bookmarkedIds.has(problem.id);

    return (
      <TouchableOpacity
        style={styles.problemItem}
        onPress={() =>
          router.push({
            pathname: "/question/[id]",
            params: { id: problem.id, mode: "learn" },
          })
        }
      >
        <Ionicons name={statusIcon.name} size={20} color={statusIcon.color} />
        <View style={styles.problemContent}>
          <Text style={styles.problemQuestion} numberOfLines={2}>
            {problem.question}
          </Text>
          <View style={styles.problemMeta}>
            <Text style={[styles.problemTag, { color: CATEGORY_MAP[problem.category].color }]}>
              {CATEGORY_MAP[problem.category].labelShort}
            </Text>
            <Text style={styles.problemDifficulty}>
              {getDifficultyStars(problem.difficulty)}
            </Text>
            {status && (
              <Text style={styles.problemTime}>
                {Math.round(status.timeMs / 1000)}秒
              </Text>
            )}
          </View>
        </View>
        {isBookmarked && (
          <Ionicons name="bookmark" size={16} color={Colors.warning} />
        )}
        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>学習</Text>
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="filter" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabs}
          contentContainerStyle={styles.categoryTabsContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryTab,
              selectedCategory === "all" && styles.categoryTabActive,
            ]}
            onPress={() => setSelectedCategory("all")}
          >
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === "all" && styles.categoryTabTextActive,
              ]}
            >
              すべて
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map((cat) => {
            const stats = getCategoryStats(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryTab,
                  selectedCategory === cat.id && styles.categoryTabActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === cat.id && styles.categoryTabTextActive,
                  ]}
                >
                  {cat.labelShort}
                </Text>
                <Text style={styles.categoryTabCount}>
                  {stats.attempted}/{stats.total}
                </Text>
                {stats.accuracy != null && (
                  <Text
                    style={[
                      styles.categoryTabAccuracy,
                      {
                        color:
                          stats.accuracy >= 70
                            ? Colors.success
                            : Colors.danger,
                      },
                    ]}
                  >
                    {stats.accuracy}%
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filter Chips */}
        {showFilters && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={styles.filterRowContent}
          >
            {(
              [
                { key: "all", label: "すべて" },
                { key: "unseen", label: "未学習" },
                { key: "wrong", label: "間違い" },
                { key: "correct", label: "正解" },
                { key: "bookmarked", label: "ブックマーク" },
                { key: "weak", label: "苦手" },
              ] as { key: FilterType; label: string }[]
            ).map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  filter === f.key && styles.filterChipActive,
                ]}
                onPress={() => setFilter(f.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filter === f.key && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Problem Count */}
        <View style={styles.resultCount}>
          <Text style={styles.resultCountText}>
            {filteredProblems.length}問
          </Text>
        </View>

        {/* Problem List */}
        <FlatList
          data={filteredProblems}
          renderItem={renderProblemItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>該当する問題がありません</Text>
            </View>
          }
        />
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.text,
  },
  filterToggle: {
    padding: Spacing.xs,
  },
  // Category tabs
  categoryTabs: {
    maxHeight: 70,
  },
  categoryTabsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  categoryTab: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 70,
  },
  categoryTabActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  categoryTabText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
  },
  categoryTabTextActive: {
    color: Colors.primary,
  },
  categoryTabCount: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  categoryTabAccuracy: {
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  // Filter chips
  filterRow: {
    maxHeight: 40,
    marginTop: Spacing.sm,
  },
  filterRowContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterChip: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: "#fff",
  },
  // Result count
  resultCount: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  resultCountText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  // Problem list
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  problemItem: {
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
  problemContent: {
    flex: 1,
  },
  problemQuestion: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  problemMeta: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  problemTag: {
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  problemDifficulty: {
    fontSize: FontSize.xs,
    color: Colors.warning,
  },
  problemTime: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
});
