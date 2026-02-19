import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../src/constants/theme";
import {
  getSettings,
  saveSettings,
  resetLearningData,
  resetTestHistory,
} from "../src/db/database";
import { AppSettings } from "../src/types";
import { toBoolean } from "../src/utils/boolean";

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>({
    timerVisible: true,
    timerPosition: "top-right",
    timerShowDigits: true,
    targetTimeSec: 45,
    learningMode: "focus",
    offlineMode: "all",
    resumeTimerBehavior: "continue",
  });

  const loadSettings = useCallback(async () => {
    try {
      const s = await getSettings();
      setSettings(s);
    } catch {
      // DB not ready
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      await saveSettings(newSettings);
    } catch {
      // ignore
    }
  };

  const handleResetLearning = () => {
    Alert.alert(
      "学習データをリセット",
      "すべての学習履歴・復習キュー・ブックマークが削除されます。この操作は取り消せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "リセット",
          style: "destructive",
          onPress: async () => {
            try {
              await resetLearningData();
              Alert.alert("完了", "学習データをリセットしました。");
            } catch {
              Alert.alert("エラー", "リセットに失敗しました。");
            }
          },
        },
      ]
    );
  };

  const handleResetTests = () => {
    Alert.alert(
      "テスト履歴をリセット",
      "すべてのテスト結果が削除されます。この操作は取り消せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "リセット",
          style: "destructive",
          onPress: async () => {
            try {
              await resetTestHistory();
              Alert.alert("完了", "テスト履歴をリセットしました。");
            } catch {
              Alert.alert("エラー", "リセットに失敗しました。");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>設定</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Timer Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>タイマー</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>タイマー表示</Text>
            <Switch
              value={toBoolean(settings.timerVisible)}
              onValueChange={(v) => updateSetting("timerVisible", v)}
              trackColor={{ true: Colors.primary }}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>数字表示</Text>
            <Switch
              value={toBoolean(settings.timerShowDigits)}
              onValueChange={(v) => updateSetting("timerShowDigits", v)}
              trackColor={{ true: Colors.primary }}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>表示位置</Text>
            <View style={styles.chipRow}>
              {(["top-right", "top-left"] as const).map((pos) => (
                <TouchableOpacity
                  key={pos}
                  style={[
                    styles.chip,
                    settings.timerPosition === pos && styles.chipActive,
                  ]}
                  onPress={() => updateSetting("timerPosition", pos)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      settings.timerPosition === pos && styles.chipTextActive,
                    ]}
                  >
                    {pos === "top-right" ? "右上" : "左上"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>目標時間（秒）</Text>
            <View style={styles.chipRow}>
              {[30, 45, 50, 60].map((sec) => (
                <TouchableOpacity
                  key={sec}
                  style={[
                    styles.chip,
                    settings.targetTimeSec === sec && styles.chipActive,
                  ]}
                  onPress={() => updateSetting("targetTimeSec", sec)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      settings.targetTimeSec === sec && styles.chipTextActive,
                    ]}
                  >
                    {sec}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Learning Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>学習モード</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>モード</Text>
            <View style={styles.chipRow}>
              {(["focus", "practice"] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.chip,
                    settings.learningMode === mode && styles.chipActive,
                  ]}
                  onPress={() => updateSetting("learningMode", mode)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      settings.learningMode === mode && styles.chipTextActive,
                    ]}
                  >
                    {mode === "focus" ? "集中" : "練習"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>再開時のタイマー</Text>
            <View style={styles.chipRow}>
              {(["continue", "reset"] as const).map((behavior) => (
                <TouchableOpacity
                  key={behavior}
                  style={[
                    styles.chip,
                    settings.resumeTimerBehavior === behavior &&
                      styles.chipActive,
                  ]}
                  onPress={() =>
                    updateSetting("resumeTimerBehavior", behavior)
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      settings.resumeTimerBehavior === behavior &&
                        styles.chipTextActive,
                    ]}
                  >
                    {behavior === "continue" ? "継続" : "リセット"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Offline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>オフライン</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>ダウンロード方式</Text>
            <View style={styles.chipRow}>
              {(["all", "on-demand"] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.chip,
                    settings.offlineMode === mode && styles.chipActive,
                  ]}
                  onPress={() => updateSetting("offlineMode", mode)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      settings.offlineMode === mode && styles.chipTextActive,
                    ]}
                  >
                    {mode === "all" ? "全問題DL" : "必要時DL"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>データ管理</Text>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleResetLearning}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={styles.dangerButtonText}>学習データリセット</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleResetTests}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={styles.dangerButtonText}>テスト履歴リセット</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>情報</Text>
          <TouchableOpacity style={styles.infoRow}>
            <Text style={styles.infoLabel}>利用規約</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoRow}>
            <Text style={styles.infoLabel}>プライバシーポリシー</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoRow}>
            <Text style={styles.infoLabel}>お問い合わせ</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>
          <View style={styles.versionRow}>
            <Text style={styles.versionText}>GAB Study v1.0.0</Text>
          </View>
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
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
    flex: 1,
  },
  chipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceSecondary,
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  dangerButtonText: {
    fontSize: FontSize.md,
    color: Colors.danger,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  versionRow: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  versionText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
});
