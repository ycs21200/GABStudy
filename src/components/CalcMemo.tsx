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

const SHORTCUTS = [
  { label: "×10", op: (n: number) => n * 10 },
  { label: "÷10", op: (n: number) => n / 10 },
  { label: "×100", op: (n: number) => n * 100 },
  { label: "÷100", op: (n: number) => n / 100 },
  { label: "%", op: (n: number) => n / 100 },
];

const UNIT_CONVERSIONS = [
  {
    label: "百万→億",
    convert: (n: number) => n / 100,
    suffix: "億円",
  },
  {
    label: "億→百万",
    convert: (n: number) => n * 100,
    suffix: "百万円",
  },
];

function evaluate(expr: string): number | null {
  try {
    const sanitized = expr.replace(/[^0-9+\-*/().% ]/g, "");
    if (!sanitized.trim()) return null;
    const result = new Function(`"use strict"; return (${sanitized})`)();
    if (typeof result === "number" && isFinite(result)) {
      return result;
    }
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

// Display-friendly operator mapping
function displayExpression(expr: string): string {
  return expr.replace(/\*/g, "×").replace(/\//g, "÷");
}

export function CalcMemo({
  visible,
  onClose,
  entries,
  onEntriesChange,
}: CalcMemoProps) {
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"keypad" | "text">("keypad");
  const [lastResult, setLastResult] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  if (!visible) return null;

  const handleCalculate = () => {
    if (!input.trim()) return;
    const result = evaluate(input);
    const entry: CalcEntry = {
      id: Date.now().toString(),
      expression: displayExpression(input),
      result: result != null ? formatResult(result) : "エラー",
    };

    if (editingId) {
      const updated = entries.map((e) =>
        e.id === editingId ? entry : e
      );
      onEntriesChange(updated);
      setEditingId(null);
    } else {
      onEntriesChange([...entries, entry]);
    }
    if (result != null) setLastResult(result);
    setInput("");
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
  };

  const handleShortcut = (shortcut: (typeof SHORTCUTS)[0]) => {
    const target = lastResult ?? getLastEntryResult();
    if (target == null) return;

    const newResult = shortcut.op(target);
    const entry: CalcEntry = {
      id: Date.now().toString(),
      expression: `${formatResult(target)} ${shortcut.label}`,
      result: formatResult(newResult),
    };
    onEntriesChange([...entries, entry]);
    setLastResult(newResult);
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
  };

  const handleUnitConversion = (conv: (typeof UNIT_CONVERSIONS)[0]) => {
    const target = lastResult ?? getLastEntryResult();
    if (target == null) return;

    const newResult = conv.convert(target);
    const entry: CalcEntry = {
      id: Date.now().toString(),
      expression: `${formatResult(target)} → ${conv.label}`,
      result: `${formatResult(newResult)} ${conv.suffix}`,
      label: conv.label,
    };
    onEntriesChange([...entries, entry]);
    setLastResult(newResult);
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
  };

  const getLastEntryResult = (): number | null => {
    const lastEntry = entries[entries.length - 1];
    if (!lastEntry) return null;
    return evaluate(lastEntry.result.replace(/,/g, "").replace(/[^\d.\-]/g, ""));
  };

  const handleEntryTap = (entry: CalcEntry) => {
    // Convert display operators back to eval operators
    const evalExpr = entry.expression.replace(/×/g, "*").replace(/÷/g, "/");
    setInput(evalExpr);
    setEditingId(entry.id);
  };

  const handleClear = () => {
    onEntriesChange([]);
    setInput("");
    setEditingId(null);
    setLastResult(null);
  };

  // ---- Keypad handlers ----

  const handleKeyPress = (key: string) => {
    switch (key) {
      case "C":
        setInput("");
        break;
      case "AC":
        setInput("");
        setLastResult(null);
        break;
      case "⌫":
        setInput((prev) => prev.slice(0, -1));
        break;
      case "=":
        handleCalculate();
        break;
      case "±":
        if (input.startsWith("-")) {
          setInput(input.slice(1));
        } else if (input.length > 0) {
          setInput("-" + input);
        }
        break;
      case "()": {
        // Smart parenthesis: count open/close
        const opens = (input.match(/\(/g) || []).length;
        const closes = (input.match(/\)/g) || []).length;
        const lastChar = input[input.length - 1];
        if (
          opens <= closes ||
          !lastChar ||
          "+-*/(".includes(lastChar)
        ) {
          setInput((prev) => prev + "(");
        } else {
          setInput((prev) => prev + ")");
        }
        break;
      }
      case "Ans":
        if (lastResult != null) {
          setInput((prev) => prev + lastResult.toString());
        }
        break;
      default:
        setInput((prev) => prev + key);
        break;
    }
  };

  // Current display value for keypad mode
  const displayInput = displayExpression(input);
  const liveResult = input.trim() ? evaluate(input) : null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>計算メモ</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.modeToggle}
              onPress={() => setMode(mode === "keypad" ? "text" : "keypad")}
            >
              <Ionicons
                name={mode === "keypad" ? "text-outline" : "keypad-outline"}
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.modeToggleText}>
                {mode === "keypad" ? "式入力" : "電卓"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearText}>クリア</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* History */}
        <ScrollView
          ref={scrollRef}
          style={styles.historyScroll}
          contentContainerStyle={styles.historyContent}
          showsVerticalScrollIndicator={false}
        >
          {entries.length === 0 && (
            <Text style={styles.emptyText}>
              {mode === "keypad"
                ? "電卓で計算できます"
                : "式を入力して計算できます"}
            </Text>
          )}
          {entries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={[
                styles.entryRow,
                editingId === entry.id && styles.entryRowEditing,
              ]}
              onPress={() => handleEntryTap(entry)}
            >
              <Text style={styles.entryExpression}>{entry.expression}</Text>
              <Text style={styles.entryEquals}>=</Text>
              <Text style={styles.entryResult}>{entry.result}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Shortcuts + Unit conversions in one row */}
        <View style={styles.shortcutRow}>
          {SHORTCUTS.map((s) => (
            <TouchableOpacity
              key={s.label}
              style={styles.shortcutButton}
              onPress={() => handleShortcut(s)}
            >
              <Text style={styles.shortcutText}>{s.label}</Text>
            </TouchableOpacity>
          ))}
          {UNIT_CONVERSIONS.map((u) => (
            <TouchableOpacity
              key={u.label}
              style={styles.unitButton}
              onPress={() => handleUnitConversion(u)}
            >
              <Text style={styles.unitText}>{u.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === "keypad" ? (
          <>
            {/* Keypad Display */}
            <View style={styles.displayArea}>
              <Text style={styles.displayExpression} numberOfLines={1}>
                {displayInput || "0"}
              </Text>
              {liveResult != null && input.trim() && (
                <Text style={styles.displayResult}>
                  = {formatResult(liveResult)}
                </Text>
              )}
            </View>

            {/* Keypad Grid */}
            <View style={styles.keypadGrid}>
              <View style={styles.keypadRow}>
                <KeypadButton label="C" onPress={handleKeyPress} type="func" />
                <KeypadButton label="()" onPress={handleKeyPress} type="func" />
                <KeypadButton label="⌫" onPress={handleKeyPress} type="func" />
                <KeypadButton label="/" display="÷" onPress={handleKeyPress} type="op" />
              </View>
              <View style={styles.keypadRow}>
                <KeypadButton label="7" onPress={handleKeyPress} />
                <KeypadButton label="8" onPress={handleKeyPress} />
                <KeypadButton label="9" onPress={handleKeyPress} />
                <KeypadButton label="*" display="×" onPress={handleKeyPress} type="op" />
              </View>
              <View style={styles.keypadRow}>
                <KeypadButton label="4" onPress={handleKeyPress} />
                <KeypadButton label="5" onPress={handleKeyPress} />
                <KeypadButton label="6" onPress={handleKeyPress} />
                <KeypadButton label="-" display="−" onPress={handleKeyPress} type="op" />
              </View>
              <View style={styles.keypadRow}>
                <KeypadButton label="1" onPress={handleKeyPress} />
                <KeypadButton label="2" onPress={handleKeyPress} />
                <KeypadButton label="3" onPress={handleKeyPress} />
                <KeypadButton label="+" onPress={handleKeyPress} type="op" />
              </View>
              <View style={styles.keypadRow}>
                <KeypadButton label="0" onPress={handleKeyPress} flex={2} />
                <KeypadButton label="." onPress={handleKeyPress} />
                <KeypadButton label="=" onPress={handleKeyPress} type="equals" />
              </View>
            </View>
          </>
        ) : (
          /* Text Input Mode */
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="式を入力（例: 112 * 16.9）"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numbers-and-punctuation"
                returnKeyType="done"
                onSubmitEditing={handleCalculate}
                autoFocus
              />
              <TouchableOpacity
                style={styles.calcButton}
                onPress={handleCalculate}
              >
                <Text style={styles.calcButtonText}>=</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </View>
  );
}

// ---- Keypad Button Component ----

function KeypadButton({
  label,
  display,
  onPress,
  type = "num",
  flex = 1,
}: {
  label: string;
  display?: string;
  onPress: (key: string) => void;
  type?: "num" | "op" | "func" | "equals";
  flex?: number;
}) {
  const bgColor =
    type === "equals"
      ? Colors.primary
      : type === "op"
        ? Colors.primaryLight
        : type === "func"
          ? Colors.surfaceSecondary
          : Colors.surface;

  const textColor =
    type === "equals"
      ? "#fff"
      : type === "op"
        ? Colors.primary
        : Colors.text;

  return (
    <TouchableOpacity
      style={[
        styles.keypadButton,
        { backgroundColor: bgColor, flex },
      ]}
      onPress={() => onPress(label)}
      activeOpacity={0.6}
    >
      <Text
        style={[
          styles.keypadButtonText,
          { color: textColor },
          type === "equals" && styles.keypadEqualsText,
        ]}
      >
        {display ?? label}
      </Text>
    </TouchableOpacity>
  );
}

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
    maxHeight: SCREEN_HEIGHT * 0.75,
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  modeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  modeToggleText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.primary,
  },
  clearText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  // History
  historyScroll: {
    maxHeight: 120,
  },
  historyContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: "center",
    paddingVertical: Spacing.lg,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  entryRowEditing: {
    backgroundColor: Colors.primaryLight,
  },
  entryExpression: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  entryEquals: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  entryResult: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  // Shortcuts
  shortcutRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.sm,
    gap: 4,
    paddingVertical: Spacing.xs,
  },
  shortcutButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.sm,
    paddingVertical: 4,
  },
  shortcutText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.text,
  },
  unitButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.sm,
    paddingVertical: 4,
  },
  unitText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.secondary,
  },
  // Keypad display
  displayArea: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
    marginHorizontal: Spacing.sm,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    minHeight: 52,
    justifyContent: "center",
  },
  displayExpression: {
    fontSize: 22,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "right",
  },
  displayResult: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "right",
    marginTop: 2,
  },
  // Keypad
  keypadGrid: {
    paddingHorizontal: Spacing.sm,
    gap: 6,
    paddingBottom: Spacing.xs,
  },
  keypadRow: {
    flexDirection: "row",
    gap: 6,
  },
  keypadButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  keypadButtonText: {
    fontSize: 20,
    fontWeight: "500",
  },
  keypadEqualsText: {
    fontWeight: "700",
  },
  // Text input mode
  inputRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  calcButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  calcButtonText: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: "#fff",
  },
});
