import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
} from "react-native";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { MISTAKE_TAGS } from "../constants/categories";
import { MistakeTag } from "../types";

interface TagSelectorProps {
  visible: boolean;
  onClose: () => void;
  selectedTags: MistakeTag[];
  memo: string;
  onSave: (tags: MistakeTag[], memo: string) => void;
}

export function TagSelector({
  visible,
  onClose,
  selectedTags,
  memo: initialMemo,
  onSave,
}: TagSelectorProps) {
  const [tags, setTags] = useState<MistakeTag[]>(selectedTags);
  const [memo, setMemo] = useState(initialMemo);

  useEffect(() => {
    setTags(selectedTags);
    setMemo(initialMemo);
  }, [selectedTags, initialMemo]);

  const toggleTag = (tag: MistakeTag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = () => {
    onSave(tags, memo);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.container}>
        <Text style={styles.title}>タグ・メモ</Text>

        <Text style={styles.label}>よくある原因</Text>
        <View style={styles.tagGrid}>
          {MISTAKE_TAGS.map((tag) => (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tagChip,
                tags.includes(tag.id) && styles.tagChipActive,
              ]}
              onPress={() => toggleTag(tag.id)}
            >
              <Text
                style={[
                  styles.tagText,
                  tags.includes(tag.id) && styles.tagTextActive,
                ]}
              >
                {tag.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>一言メモ（任意）</Text>
        <TextInput
          style={styles.memoInput}
          value={memo}
          onChangeText={setMemo}
          placeholder="例：百万円→億円の変換忘れ"
          placeholderTextColor={Colors.textTertiary}
          maxLength={50}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>保存</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tagChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  tagText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  tagTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  memoInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  saveText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: "#fff",
  },
});
