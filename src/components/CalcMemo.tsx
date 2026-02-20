import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { toBoolean } from "../utils/boolean";

interface CalcEntry {
  id: string;
  expression: string;
  result: string;
  label?: string;
}

interface CalcMemoProps {
  visible: boolean;
  onClose: () => void;
  entries: CalcEntry[];
  onEntriesChange: (entries: CalcEntry[]) => void;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

/* ── GAB特化ショートカット（最下段） ── */
const GAB_SHORTCUTS = [
  { label: "×10", op: (n: number) => n * 10 },
  { label: "÷10", op: (n: number) => n / 10 },
  { label: "×100", op: (n: number) => n * 100 },
  {
    label: "百万→億",
    op: (n: number) => n / 100,
    suffix: "億円",
  },
];

/* ── キーパッド配列（画像準拠） ── */
const KEYPAD_ROWS = [
  ["7", "8", "9", "÷"],
  ["4", "5", "6", "×"],
  ["1", "2", "3", "−"],
  ["0", ".", "=", "+"],
  ["C/AC", "(", ")", "%"],
];

const OP_KEYS = new Set(["÷", "×", "−", "+", "(", ")", "%"]);

/* ── 計算エンジン ── */
function evaluate(expr: string): number | null {
  try {
    const sanitized = expr.replace(/[^0-9+\-*/().% ]/g, "");
    if (!sanitized.trim()) return null;
    const result = new Function(`"use strict"; return (${sanitized})`)();
    if (typeof result === "number" && isFinite(result)) return result;
    return null;
  } catch {
    return null;
  }
}

function formatResult(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString();
  const rounded = Math.round(n * 10000) / 10000;
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function toEval(display: string): string {
  return display.replace(/÷/g, "/").replace(/×/g, "*").replace(/−/g, "-");
}

/* ── コンポーネント ── */
export function CalcMemo({
  visible,
  onClose,
  entries,
  onEntriesChange,
}: CalcMemoProps) {
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [useKeypad, setUseKeypad] = useState(true);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const isVisible = toBoolean(visible);
  if (!isVisible) return null;

  /* ── 計算実行 ── */
  const handleCalculate = () => {
    if (!input.trim()) return;
    const result = evaluate(toEval(input));
    const entry: CalcEntry = {
      id: Date.now().toString(),
      expression: input,
      result: result != null ? formatResult(result) : "エラー",
    };

    if (editingId) {
      onEntriesChange(entries.map((e) => (e.id === editingId ? entry : e)));
      setEditingId(null);
    } else {
      onEntriesChange([...entries, entry]);
    }
    setLastResult(result);
    setInput("");
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
  };

  /* ── キーパッド入力 ── */
  const handleKey = (key: string) => {
    if (key === "=") {
      handleCalculate();
      return;
    }
    if (key === "C/AC") {
      if (input === "") {
        // AC: 履歴もクリア
        onEntriesChange([]);
        setLastResult(null);
        setEditingId(null);
      } else {
        // C: 入力だけクリア
        setInput("");
        setEditingId(null);
      }
      return;
    }
    setInput((prev) => prev + key);
  };

  /* ── GABショートカット（直前の結果に適用） ── */
  const handleShortcut = (sc: (typeof GAB_SHORTCUTS)[0]) => {
    // 入力中の式がある場合はまず計算してから適用
    const base = (() => {
      if (input.trim()) {
        const r = evaluate(toEval(input));
        if (r != null) {
          // 先に現在の式を確定
          const entry: CalcEntry = {
            id: Date.now().toString(),
            expression: input,
            result: formatResult(r),
          };
          onEntriesChange([...entries, entry]);
          setInput("");
          return r;
        }
      }
      // 直前の履歴から取得
      const last = entries[entries.length - 1];
      if (!last) return null;
      return evaluate(last.result.replace(/,/g, ""));
    })();

    if (base == null) return;

    const newResult = sc.op(base);
    const suffix = "suffix" in sc ? ` ${sc.suffix}` : "";
    const entry: CalcEntry = {
      id: (Date.now() + 1).toString(),
      expression: `${formatResult(base)} ${sc.label}`,
      result: `${formatResult(newResult)}${suffix}`,
    };
    onEntriesChange([...entries, entry]);
    setLastResult(newResult);
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
  };

  /* ── 履歴タップ ── */
  const handleEntryTap = (entry: CalcEntry) => {
    setInput(entry.expression);
    setEditingId(entry.id);
  };

  /* ── モード切替 ── */
  const toggleMode = () => {
    setUseKeypad((prev) => !prev);
    if (useKeypad) setTimeout(() => inputRef.current?.focus(), 100);
  };

  /* ── リアルタイムプレビュー ── */
  const preview = input.trim() ? evaluate(toEval(input)) : null;

  /* ── 表示テキスト（画像の「式 = 結果」形式） ── */
  const displayText = (() => {
    if (input) return input;
    const last = entries[entries.length - 1];
    if (last) return `${last.expression} = ${last.result}`;
    return "";
  })();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.overlay}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.container}>
        {/* ── ヘッダー ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>計算メモ</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleMode} style={styles.modeToggle}>
              <Ionicons
                name={useKeypad ? "keypad-outline" : "calculator-outline"}
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.modeToggleText}>
                {useKeypad ? "式入力" : "キーパッド"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 履歴 ── */}
        <ScrollView
          ref={scrollRef}
          style={styles.history}
          contentContainerStyle={styles.historyInner}
          showsVerticalScrollIndicator={false}
        >
          {entries.length === 0 && !input && (
            <Text style={styles.emptyText}>式を入力して計算</Text>
          )}
          {entries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={[
                styles.entryRow,
                editingId === entry.id && styles.entryEditing,
              ]}
              onPress={() => handleEntryTap(entry)}
            >
              <Text style={styles.entryExpr} numberOfLines={1}>
                {entry.expression}
              </Text>
              <Text style={styles.entryEq}>=</Text>
              <Text style={styles.entryRes} numberOfLines={1}>
                {entry.result}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── 表示欄（式 = 結果） ── */}
        <View style={styles.display}>
          <Text style={styles.displayText} numberOfLines={1} adjustsFontSizeToFit>
            {displayText || " "}
          </Text>
          {preview != null && input !== "" && (
            <Text style={styles.displayPreview} numberOfLines={1}>
              = {formatResult(preview)}
            </Text>
          )}
        </View>

        {useKeypad ? (
          <>
            {/* ── キーパッド ── */}
            <View style={styles.keypad}>
              {KEYPAD_ROWS.map((row, ri) => (
                <View key={ri} style={styles.keyRow}>
                  {row.map((key) => {
                    const isOp = OP_KEYS.has(key);
                    const isEq = key === "=";
                    const isClear = key === "C/AC";
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.key,
                          isOp && styles.keyOp,
                          isEq && styles.keyEq,
                          isClear && styles.keyClear,
                        ]}
                        onPress={() => handleKey(key)}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            styles.keyText,
                            isOp && styles.keyTextOp,
                            isEq && styles.keyTextEq,
                            isClear && styles.keyTextClear,
                          ]}
                        >
                          {isClear ? (input ? "C" : "AC") : key}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* ── GAB特化ショートカット ── */}
            <View style={styles.shortcuts}>
              {GAB_SHORTCUTS.map((sc) => (
                <TouchableOpacity
                  key={sc.label}
                  style={styles.scButton}
                  onPress={() => handleShortcut(sc)}
                >
                  <Text style={styles.scText}>{sc.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          /* ── キーボード式入力モード ── */
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="式を入力（例: 112 * 16.9）"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              onSubmitEditing={handleCalculate}
              autoFocus
            />
            <TouchableOpacity style={styles.eqButton} onPress={handleCalculate}>
              <Text style={styles.eqButtonText}>=</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/* ── スタイル ── */
const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 100,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: SCREEN_HEIGHT * 0.72,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },

  /* ヘッダー */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  modeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  modeToggleText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: "600",
  },
  closeButton: {
    padding: Spacing.xs,
  },

  /* 履歴 */
  history: {
    maxHeight: 100,
  },
  historyInner: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: "center",
    paddingVertical: Spacing.md,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  entryEditing: {
    backgroundColor: Colors.primaryLight,
  },
  entryExpr: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  entryEq: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  entryRes: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
  },

  /* 表示欄 */
  display: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 52,
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  displayText: {
    fontSize: 22,
    fontWeight: "500",
    color: Colors.text,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  displayPreview: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    textAlign: "right",
    marginTop: 2,
    fontWeight: "600",
  },

  /* キーパッド */
  keypad: {
    paddingHorizontal: Spacing.sm,
    gap: 6,
  },
  keyRow: {
    flexDirection: "row",
    gap: 6,
  },
  key: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    height: 46,
  },
  keyOp: {
    backgroundColor: Colors.primaryLight,
  },
  keyEq: {
    backgroundColor: Colors.primary,
  },
  keyClear: {
    backgroundColor: Colors.dangerLight,
  },
  keyText: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.text,
  },
  keyTextOp: {
    color: Colors.primary,
    fontWeight: "700",
  },
  keyTextEq: {
    color: "#fff",
    fontWeight: "700",
    fontSize: FontSize.xl,
  },
  keyTextClear: {
    color: Colors.danger,
    fontWeight: "700",
  },

  /* GABショートカット */
  shortcuts: {
    flexDirection: "row",
    paddingHorizontal: Spacing.sm,
    gap: 6,
    marginTop: Spacing.sm,
  },
  scButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
  },
  scText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.secondary,
  },

  /* キーボード入力モード */
  inputRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  eqButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  eqButtonText: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: "#fff",
  },
});
