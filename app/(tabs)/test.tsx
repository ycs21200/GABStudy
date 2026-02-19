import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../src/constants/theme";
import { CATEGORIES } from "../../src/constants/categories";
import { SAMPLE_PROBLEMS } from "../../src/db/sampleProblems";
import { getTestResults, getAllAttempts } from "../../src/db/database";
import {
  pickWeaknessTest,
  pickQuickSession,
} from "../../src/logic/sessionPicker";
import { TestResult, Attempt, Category } from "../../src/types";

interface TestPreset {
  label: string;
  questionCount: number;
  timeLimitMin: number;
  description: string;
  icon: string;
}

const TEST_PRESETS: TestPreset[] = [
  {
    label: "本番練習",
    questionCount: 20,
    timeLimitMin: 16,
    description: "20問 / 16分（本番同等）",
    icon: "trophy-outline",
  },
  {
    label: "ハーフ",
    questionCount: 10,
    timeLimitMin: 8,
    description: "10問 / 8分（短時間）",
    icon: "timer-outline",
  },
  {
    label: "ミニテスト",
    questionCount: 5,
    timeLimitMin: 4,
    description: "5問 / 4分（お手軽）",
    icon: "flash-outline",
  },
];

export default function TestScreen() {
  const router = useRouter();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [customCount, setCustomCount] = useState(10);
  const [customTimeMin, setCustomTimeMin] = useState(8);
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(
    new Set(["table", "bar", "pie", "composite"])
  );

  const loadData = useCallback(async () => {
    try {
      const results = await getTestResults();
      setTestResults(results);
    } catch {
      // DB not ready
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startPresetTest = (preset: TestPreset) => {
    // Select random problems
    const shuffled = [...SAMPLE_PROBLEMS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, preset.questionCount);
    const problemIds = selected.map((p) => p.id);

    router.push({
      pathname: "/test-session",
      params: {
        problemIds: JSON.stringify(problemIds),
        timeLimit: (preset.timeLimitMin * 60).toString(),
        label: preset.label,
      },
    });
  };

  const startWeaknessTest = async () => {
    try {
      const attempts = await getAllAttempts();
      const latestAttempts = new Map<string, Attempt>();
      for (const a of attempts) {
        if (!latestAttempts.has(a.problemId)) {
          latestAttempts.set(a.problemId, a);
        }
      }

      if (latestAttempts.size < 5) {
        Alert.alert("データ不足", "弱点テストには最低5問の学習履歴が必要です。");
        return;
      }

      const weakProblems = pickWeaknessTest(
        SAMPLE_PROBLEMS,
        latestAttempts,
        10
      );
      const problemIds = weakProblems.map((p) => p.id);

      router.push({
        pathname: "/test-session",
        params: {
          problemIds: JSON.stringify(problemIds),
          timeLimit: (8 * 60).toString(),
          label: "弱点テスト",
        },
      });
    } catch {
      Alert.alert("エラー", "テストの準備に失敗しました。");
    }
  };

  const startCustomTest = () => {
    const filtered = SAMPLE_PROBLEMS.filter((p) =>
      selectedCategories.has(p.category)
    );
    if (filtered.length < customCount) {
      Alert.alert(
        "問題数不足",
        `選択カテゴリに${filtered.length}問しかありません。`
      );
      return;
    }
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, customCount);

    router.push({
      pathname: "/test-session",
      params: {
        problemIds: JSON.stringify(selected.map((p) => p.id)),
        timeLimit: (customTimeMin * 60).toString(),
        label: "カスタムテスト",
      },
    });
  };

  const toggleCategory = (cat: Category) => {
    const next = new Set(selectedCategories);
    if (next.has(cat)) {
      if (next.size > 1) next.delete(cat);
    } else {
      next.add(cat);
    }
    setSelectedCategories(next);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>テスト</Text>

        {/* Preset Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プリセット模試</Text>
          {TEST_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.label}
              style={styles.presetCard}
              onPress={() => startPresetTest(preset)}
            >
              <Ionicons
                name={preset.icon as any}
                size={28}
                color={Colors.primary}
              />
              <View style={styles.presetContent}>
                <Text style={styles.presetLabel}>{preset.label}</Text>
                <Text style={styles.presetDesc}>{preset.description}</Text>
              </View>
              <View style={styles.startBadge}>
                <Text style={styles.startBadgeText}>START</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weakness Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>弱点テスト</Text>
          <TouchableOpacity
            style={styles.weaknessCard}
            onPress={startWeaknessTest}
          >
            <Ionicons name="alert-circle" size={28} color={Colors.danger} />
            <View style={styles.presetContent}>
              <Text style={styles.presetLabel}>弱点テスト</Text>
              <Text style={styles.presetDesc}>
                間違い＆遅い問題から自動構成
              </Text>
            </View>
            <View style={[styles.startBadge, { backgroundColor: Colors.danger }]}>
              <Text style={styles.startBadgeText}>START</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Custom Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>カスタムテスト</Text>
          <View style={styles.customCard}>
            {/* Question Count */}
            <View style={styles.customRow}>
              <Text style={styles.customLabel}>問数</Text>
              <View style={styles.customSelector}>
                {[5, 10, 15, 20].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.customChip,
                      customCount === n && styles.customChipActive,
                    ]}
                    onPress={() => setCustomCount(n)}
                  >
                    <Text
                      style={[
                        styles.customChipText,
                        customCount === n && styles.customChipTextActive,
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time Limit */}
            <View style={styles.customRow}>
              <Text style={styles.customLabel}>制限時間</Text>
              <View style={styles.customSelector}>
                {[4, 8, 12, 16].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.customChip,
                      customTimeMin === n && styles.customChipActive,
                    ]}
                    onPress={() => setCustomTimeMin(n)}
                  >
                    <Text
                      style={[
                        styles.customChipText,
                        customTimeMin === n && styles.customChipTextActive,
                      ]}
                    >
                      {n}分
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Categories */}
            <View style={styles.customRow}>
              <Text style={styles.customLabel}>カテゴリ</Text>
              <View style={styles.customSelector}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.customChip,
                      selectedCategories.has(cat.id) && styles.customChipActive,
                    ]}
                    onPress={() => toggleCategory(cat.id)}
                  >
                    <Text
                      style={[
                        styles.customChipText,
                        selectedCategories.has(cat.id) &&
                          styles.customChipTextActive,
                      ]}
                    >
                      {cat.labelShort}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.customStartButton}
              onPress={startCustomTest}
            >
              <Text style={styles.customStartText}>
                テスト開始（{customCount}問 / {customTimeMin}分）
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Test History */}
        {testResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>テスト履歴</Text>
            {testResults.slice(0, 10).map((result) => (
              <TouchableOpacity
                key={result.id}
                style={styles.historyItem}
                onPress={() =>
                  router.push({
                    pathname: "/test-result/[id]",
                    params: { id: result.id },
                  })
                }
              >
                <View style={styles.historyContent}>
                  <Text style={styles.historyScore}>
                    {result.correctCount}/{result.totalQuestions}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(result.completedAt).toLocaleDateString("ja-JP")}
                  </Text>
                </View>
                <View style={styles.historyMeta}>
                  <Text style={styles.historyAccuracy}>
                    {Math.round(
                      (result.correctCount / result.totalQuestions) * 100
                    )}
                    %
                  </Text>
                  <Text style={styles.historyTime}>
                    平均{Math.round(result.averageTimeMs / 1000)}秒
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.textTertiary}
                />
              </TouchableOpacity>
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  // Preset cards
  presetCard: {
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
  presetContent: {
    flex: 1,
  },
  presetLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  presetDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
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
  // Weakness card
  weaknessCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  // Custom test
  customCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.lg,
  },
  customRow: {
    gap: Spacing.sm,
  },
  customLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
  },
  customSelector: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  customChip: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
  },
  customChipActive: {
    backgroundColor: Colors.primary,
  },
  customChipText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  customChipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  customStartButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  customStartText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: "#fff",
  },
  // History
  historyItem: {
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
  historyContent: {
    flex: 1,
  },
  historyScore: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
  },
  historyDate: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  historyMeta: {
    alignItems: "flex-end",
  },
  historyAccuracy: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.success,
  },
  historyTime: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
});
