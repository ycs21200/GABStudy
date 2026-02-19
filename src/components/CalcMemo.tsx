import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
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

const SHORTCUTS = [
  { label: "×10", op: (n: number) => n * 10 },
  { label: "÷10", op: (n: number) => n / 10 },
  { label: "×100", op: (n: number) => n * 100 },
  { label: "÷100", op: (n: number) => n / 100 },
  { label: "%", op: (n: number) => n / 100 },
];

const UNIT_CONVERSIONS = [
  {
    label: "百万円→億円",
    convert: (n: number) => n / 100,
    suffix: "億円",
  },
  {
    label: "億円→百万円",
    convert: (n: number) => n * 100,
    suffix: "百万円",
  },
];

/**
 * Calculate the result of a simple math expression.
 * Supports: +, -, *, /, parentheses, decimals
 */
function evaluate(expr: string): number | null {
  try {
    // Sanitize: only allow numbers, operators, parentheses, decimals
    const sanitized = expr.replace(/[^0-9+\-*/().% ]/g, "");
    if (!sanitized.trim()) return null;
    // Use Function constructor for safe eval of math expressions
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
  // Show up to 4 decimal places
  const rounded = Math.round(n * 10000) / 10000;
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function CalcMemo({
  visible,
  onClose,
  entries,
  onEntriesChange,
}: CalcMemoProps) {
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const isVisible = toBoolean(visible);
  if (!isVisible) return null;

  const handleCalculate = () => {
    if (!input.trim()) return;
    const result = evaluate(input);
    const entry: CalcEntry = {
      id: Date.now().toString(),
      expression: input,
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
    setInput("");
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
  };

  const handleShortcut = (shortcut: (typeof SHORTCUTS)[0]) => {
    // Apply to the last result
    const lastEntry = entries[entries.length - 1];
    if (!lastEntry) return;
    const lastResult = evaluate(lastEntry.result.replace(/,/g, ""));
    if (lastResult == null) return;

    const newResult = shortcut.op(lastResult);
    const entry: CalcEntry = {
      id: Date.now().toString(),
      expression: `${lastEntry.result} ${shortcut.label}`,
      result: formatResult(newResult),
    };
    onEntriesChange([...entries, entry]);
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
  };

  const handleUnitConversion = (conv: (typeof UNIT_CONVERSIONS)[0]) => {
    const lastEntry = entries[entries.length - 1];
    if (!lastEntry) return;
    const lastResult = evaluate(lastEntry.result.replace(/,/g, ""));
    if (lastResult == null) return;

    const newResult = conv.convert(lastResult);
    const entry: CalcEntry = {
      id: Date.now().toString(),
      expression: `${lastEntry.result} → ${conv.label}`,
      result: `${formatResult(newResult)} ${conv.suffix}`,
      label: conv.label,
    };
    onEntriesChange([...entries, entry]);
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
  };

  const handleEntryTap = (entry: CalcEntry) => {
    setInput(entry.expression);
    setEditingId(entry.id);
  };

  const handleClear = () => {
    onEntriesChange([]);
    setInput("");
    setEditingId(null);
  };

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>計算メモ</Text>
          <View style={styles.headerActions}>
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
              式を入力して計算できます
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

        {/* Shortcuts */}
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
        </View>

        {/* Unit Conversion */}
        <View style={styles.unitRow}>
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

        {/* Input */}
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
          />
          <TouchableOpacity
            style={styles.calcButton}
            onPress={handleCalculate}
          >
            <Text style={styles.calcButtonText}>=</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    maxHeight: SCREEN_HEIGHT * 0.55,
    paddingBottom: 34, // safe area
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
  clearText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  // History
  historyScroll: {
    maxHeight: 180,
  },
  historyContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
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
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  shortcutButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
  },
  shortcutText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
  },
  // Unit conversion
  unitRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  unitButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
  },
  unitText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.secondary,
  },
  // Input
  inputRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
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
