import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Colors, Spacing, FontSize, BorderRadius } from "../../src/constants/theme";
import { CATEGORY_MAP } from "../../src/constants/categories";
import {
  SAMPLE_PROBLEMS,
  getProblemById,
} from "../../src/db/sampleProblems";
import {
  saveAttempt,
  getProblemNote,
  saveProblemNote,
  upsertReviewItem,
  saveSessionState,
  clearSession,
  getActiveSession,
  getSettings,
  getDueReviews,
  getAllAttempts,
} from "../../src/db/database";
import {
  pickQuickSession,
  pickReviewSession,
  pickSpeedSession,
} from "../../src/logic/sessionPicker";
import { computeNextReview } from "../../src/logic/reviewScheduler";
import {
  Problem,
  Attempt,
  SessionState,
  MistakeTag,
  ProblemNote,
  AppSettings,
} from "../../src/types";
import { useTimer } from "../../src/hooks/useTimer";
import { ProgressRing } from "../../src/components/ProgressRing";
import { CalcMemo } from "../../src/components/CalcMemo";
import { TagSelector } from "../../src/components/TagSelector";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface CalcEntry {
  id: string;
  expression: string;
  result: string;
  label?: string;
}

export default function QuestionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    mode?: string;
    duration?: string;
    sessionId?: string;
  }>();

  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showCalcMemo, setShowCalcMemo] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [calcEntries, setCalcEntries] = useState<CalcEntry[]>([]);
  const [noteTags, setNoteTags] = useState<MistakeTag[]>([]);
  const [noteMemo, setNoteMemo] = useState("");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [sessionId] = useState(() => Date.now().toString());

  const timer = useTimer(0);

  // Pinch-to-zoom for image
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2);
        savedScale.value = 2;
      }
    });

  const composed = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Initialize problems based on mode
  useEffect(() => {
    (async () => {
      try {
        const s = await getSettings();
        setSettings(s);
      } catch {
        // use defaults
      }

      const mode = params.mode ?? "learn";

      if (mode === "learn" && params.id !== "quick") {
        // Single problem
        const problem = getProblemById(params.id);
        if (problem) {
          setProblems([problem]);
          loadNote(problem.id);
        }
      } else if (mode === "quick" || mode === "review" || mode === "speed") {
        // Auto-pick session
        try {
          const attempts = await getAllAttempts();
          const latestAttempts = new Map<string, Attempt>();
          for (const a of attempts) {
            if (!latestAttempts.has(a.problemId)) {
              latestAttempts.set(a.problemId, a);
            }
          }
          const dueReviews = await getDueReviews();

          let picked: Problem[];
          if (mode === "review") {
            picked = pickReviewSession(
              SAMPLE_PROBLEMS,
              latestAttempts,
              dueReviews
            );
          } else if (mode === "speed") {
            picked = pickSpeedSession(SAMPLE_PROBLEMS, latestAttempts);
          } else {
            const duration = parseInt(params.duration ?? "180", 10);
            picked = pickQuickSession(
              duration,
              SAMPLE_PROBLEMS,
              latestAttempts,
              dueReviews
            );
          }

          if (picked.length === 0) {
            // Fallback: random problems
            picked = [...SAMPLE_PROBLEMS]
              .sort(() => Math.random() - 0.5)
              .slice(0, 5);
          }

          setProblems(picked);
          if (picked.length > 0) loadNote(picked[0].id);
        } catch {
          // Fallback
          const picked = [...SAMPLE_PROBLEMS]
            .sort(() => Math.random() - 0.5)
            .slice(0, 5);
          setProblems(picked);
        }
      } else if (mode === "resume") {
        try {
          const session = await getActiveSession();
          if (session) {
            const probs = session.problemIds
              .map(getProblemById)
              .filter(Boolean) as Problem[];
            setProblems(probs);
            setCurrentIndex(session.currentIndex);
            if (probs.length > 0)
              loadNote(probs[session.currentIndex]?.id ?? probs[0].id);
          }
        } catch {
          router.back();
        }
      }

      timer.start();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNote = async (problemId: string) => {
    try {
      const note = await getProblemNote(problemId);
      if (note) {
        setBookmarked(note.bookmarked);
        setNoteTags(note.tags);
        setNoteMemo(note.memo);
      } else {
        setBookmarked(false);
        setNoteTags([]);
        setNoteMemo("");
      }
    } catch {
      // ignore
    }
  };

  const currentProblem = problems[currentIndex];
  const isLastProblem = currentIndex >= problems.length - 1;
  const categoryInfo = currentProblem
    ? CATEGORY_MAP[currentProblem.category]
    : null;
  const targetTimeSec = categoryInfo?.targetTimeSec ?? 45;

  const handleSelectChoice = (index: number) => {
    if (isConfirmed) return;
    setSelectedChoice(index);
  };

  const handleConfirm = async () => {
    if (selectedChoice === null || !currentProblem) return;
    timer.pause();
    setIsConfirmed(true);

    const isCorrect = selectedChoice === currentProblem.correctIndex;

    // Save attempt
    const attempt: Attempt = {
      id: `${currentProblem.id}-${Date.now()}`,
      problemId: currentProblem.id,
      answeredAt: new Date().toISOString(),
      isCorrect,
      selectedIndex: selectedChoice,
      timeMs: timer.elapsedMs,
      calcHistory: calcEntries.length > 0 ? JSON.stringify(calcEntries) : undefined,
    };

    try {
      await saveAttempt(attempt);

      // Update review queue
      const reviewItem = computeNextReview(currentProblem.id, isCorrect, null);
      await upsertReviewItem(reviewItem);

      // Save session state
      const session: SessionState = {
        id: sessionId,
        type: "quick",
        problemIds: problems.map((p) => p.id),
        currentIndex,
        answers: [],
        startedAt: new Date().toISOString(),
        elapsedMs: timer.elapsedMs,
        label: `${categoryInfo?.label ?? "学習"} #${currentIndex + 1}`,
      };
      await saveSessionState(session);
    } catch {
      // ignore DB errors silently
    }

    setShowExplanation(true);
  };

  const handleNext = async () => {
    if (isLastProblem) {
      // Clear session and go back
      try {
        await clearSession(sessionId);
      } catch {
        // ignore
      }
      router.back();
      return;
    }

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedChoice(null);
    setIsConfirmed(false);
    setShowExplanation(false);
    setCalcEntries([]);
    timer.reset();
    timer.start();

    // Reset zoom
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);

    if (problems[nextIndex]) {
      loadNote(problems[nextIndex].id);
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentProblem) return;
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    try {
      await saveProblemNote({
        problemId: currentProblem.id,
        bookmarked: newBookmarked,
        tags: noteTags,
        memo: noteMemo,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  };

  const handleSaveTags = async (tags: MistakeTag[], memo: string) => {
    if (!currentProblem) return;
    setNoteTags(tags);
    setNoteMemo(memo);
    try {
      await saveProblemNote({
        problemId: currentProblem.id,
        bookmarked,
        tags,
        memo,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  };

  const handleBack = () => {
    Alert.alert("学習を終了", "途中の学習を保存して戻りますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "保存して戻る",
        onPress: async () => {
          timer.pause();
          try {
            const session: SessionState = {
              id: sessionId,
              type: "quick",
              problemIds: problems.map((p) => p.id),
              currentIndex,
              answers: [],
              startedAt: new Date().toISOString(),
              elapsedMs: timer.elapsedMs,
              label: `${categoryInfo?.label ?? "学習"} #${currentIndex + 1}`,
            };
            await saveSessionState(session);
          } catch {
            // ignore
          }
          router.back();
        },
      },
      {
        text: "保存せず戻る",
        style: "destructive",
        onPress: () => router.back(),
      },
    ]);
  };

  if (!currentProblem) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>問題を読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerCategory} numberOfLines={1}>
            {categoryInfo?.label ?? ""}{" "}
            <Text style={styles.headerProgress}>
              {currentIndex + 1}/{problems.length}
            </Text>
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleToggleBookmark}
              style={styles.headerButton}
            >
              <Ionicons
                name={bookmarked ? "bookmark" : "bookmark-outline"}
                size={20}
                color={bookmarked ? Colors.warning : Colors.text}
              />
            </TouchableOpacity>
            {/* Timer */}
            {settings?.timerVisible !== false && (
              <ProgressRing
                elapsedSec={timer.elapsedSec}
                targetSec={targetTimeSec}
                showDigits={settings?.timerShowDigits !== false}
                formatted={timer.formatted}
              />
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
        >
          {/* Image/Chart Area */}
          {currentProblem.imageUri ? (
            <GestureDetector gesture={composed}>
              <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
                <Image
                  source={{ uri: currentProblem.imageUri }}
                  style={styles.chartImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </GestureDetector>
          ) : (
            <View style={styles.placeholderChart}>
              <Ionicons
                name={categoryInfo?.icon as any ?? "image-outline"}
                size={48}
                color={Colors.textTertiary}
              />
              <Text style={styles.placeholderText}>
                図表エリア（ピンチズーム対応）
              </Text>
            </View>
          )}

          {/* Question */}
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>{currentProblem.question}</Text>
          </View>

          {/* Choices */}
          <View style={styles.choicesContainer}>
            {currentProblem.choices.map((choice, index) => {
              const isSelected = selectedChoice === index;
              const isCorrect =
                isConfirmed && index === currentProblem.correctIndex;
              const isWrong = isConfirmed && isSelected && !isCorrect;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.choiceButton,
                    isSelected && !isConfirmed && styles.choiceSelected,
                    isCorrect && styles.choiceCorrect,
                    isWrong && styles.choiceWrong,
                  ]}
                  onPress={() => handleSelectChoice(index)}
                  disabled={isConfirmed}
                >
                  <View
                    style={[
                      styles.choiceLabel,
                      isSelected && !isConfirmed && styles.choiceLabelSelected,
                      isCorrect && styles.choiceLabelCorrect,
                      isWrong && styles.choiceLabelWrong,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceLabelText,
                        (isSelected || isCorrect || isWrong) &&
                          styles.choiceLabelTextActive,
                      ]}
                    >
                      {choice.label}
                    </Text>
                  </View>
                  <Text style={styles.choiceText}>{choice.text}</Text>
                  {isCorrect && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={Colors.success}
                    />
                  )}
                  {isWrong && (
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={Colors.danger}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Confirm Button */}
          {selectedChoice !== null && !isConfirmed && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>確定</Text>
            </TouchableOpacity>
          )}

          {/* Explanation */}
          {showExplanation && (
            <View style={styles.explanationContainer}>
              <View style={styles.resultBadge}>
                {selectedChoice === currentProblem.correctIndex ? (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={Colors.success}
                    />
                    <Text style={[styles.resultText, { color: Colors.success }]}>
                      正解！（{Math.round(timer.elapsedMs / 1000)}秒）
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="close-circle"
                      size={24}
                      color={Colors.danger}
                    />
                    <Text style={[styles.resultText, { color: Colors.danger }]}>
                      不正解（{Math.round(timer.elapsedMs / 1000)}秒）
                    </Text>
                  </>
                )}
              </View>

              <Text style={styles.explanationTitle}>解説</Text>
              {currentProblem.explanation.map((step, i) => (
                <View key={i} style={styles.explanationStep}>
                  <Text style={styles.stepLabel}>{step.label}</Text>
                  <Text style={styles.stepContent}>{step.content}</Text>
                </View>
              ))}

              {currentProblem.commonMistakes.length > 0 && (
                <>
                  <Text style={styles.mistakesTitle}>よくあるミス</Text>
                  {currentProblem.commonMistakes.map((mistake, i) => (
                    <View key={i} style={styles.mistakeRow}>
                      <Ionicons
                        name="alert-circle"
                        size={14}
                        color={Colors.warning}
                      />
                      <Text style={styles.mistakeText}>{mistake}</Text>
                    </View>
                  ))}
                </>
              )}

              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>
                  {isLastProblem ? "終了" : "次の問題"}
                </Text>
                <Ionicons
                  name={isLastProblem ? "checkmark" : "arrow-forward"}
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => setShowCalcMemo(true)}
          >
            <Ionicons name="calculator-outline" size={22} color={Colors.text} />
            <Text style={styles.toolLabel}>計算メモ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => setShowTagSelector(true)}
          >
            <Ionicons name="pricetag-outline" size={22} color={Colors.text} />
            <Text style={styles.toolLabel}>タグ</Text>
          </TouchableOpacity>
        </View>

        {/* Calc Memo Overlay */}
        <CalcMemo
          visible={showCalcMemo}
          onClose={() => setShowCalcMemo(false)}
          entries={calcEntries}
          onEntriesChange={setCalcEntries}
        />

        {/* Tag Selector */}
        <TagSelector
          visible={showTagSelector}
          onClose={() => setShowTagSelector(false)}
          selectedTags={noteTags}
          memo={noteMemo}
          onSave={handleSaveTags}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  headerCategory: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
  },
  headerProgress: {
    fontSize: FontSize.sm,
    fontWeight: "400",
    color: Colors.textSecondary,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  // Content
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: Spacing.lg,
  },
  // Image
  imageContainer: {
    width: "100%",
    height: 220,
    marginVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    backgroundColor: Colors.surfaceSecondary,
  },
  chartImage: {
    width: "100%",
    height: "100%",
  },
  placeholderChart: {
    width: "100%",
    height: 180,
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
  // Question
  questionContainer: {
    marginBottom: Spacing.lg,
  },
  questionText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 24,
  },
  // Choices
  choicesContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
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
  choiceCorrect: {
    borderColor: Colors.success,
    backgroundColor: Colors.successLight,
  },
  choiceWrong: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
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
  choiceLabelCorrect: {
    backgroundColor: Colors.success,
  },
  choiceLabelWrong: {
    backgroundColor: Colors.danger,
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
  // Confirm
  confirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  confirmButtonText: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: "#fff",
  },
  // Explanation
  explanationContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  resultText: {
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  explanationTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  explanationStep: {
    marginBottom: Spacing.md,
    paddingLeft: Spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
  },
  stepLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 2,
  },
  stepContent: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  mistakesTitle: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.warning,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  mistakeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  mistakeText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  nextButton: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  nextButtonText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: "#fff",
  },
  // Toolbar
  toolbar: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 24,
    gap: Spacing.xl,
    justifyContent: "center",
  },
  toolButton: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: Spacing.lg,
  },
  toolLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
});
