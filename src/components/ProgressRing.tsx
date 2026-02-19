import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, FontSize } from "../constants/theme";

interface ProgressRingProps {
  /** Current seconds elapsed */
  elapsedSec: number;
  /** Target time in seconds */
  targetSec: number;
  /** Whether to show digits */
  showDigits: boolean;
  /** Size of the ring */
  size?: number;
  /** Formatted time string */
  formatted: string;
}

/**
 * A minimal timer chip with a thin progress ring indicator.
 * Shows elapsed time and uses color to indicate target status.
 */
export function ProgressRing({
  elapsedSec,
  targetSec,
  showDigits,
  size = 48,
  formatted,
}: ProgressRingProps) {
  const progress = Math.min(elapsedSec / targetSec, 1);
  const isOvertime = elapsedSec > targetSec;

  // Simple ring visualization using borders
  const ringColor = isOvertime ? Colors.timerOvertime : Colors.timerRing;
  const bgColor = isOvertime
    ? `${Colors.timerOvertime}15`
    : `${Colors.timerRing}10`;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Progress indicator (thin bar at bottom) */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: ringColor,
            },
          ]}
        />
      </View>
      {showDigits && (
        <Text style={[styles.timeText, { color: ringColor }]}>
          {formatted}
        </Text>
      )}
      {!showDigits && (
        <View style={[styles.dot, { backgroundColor: ringColor }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    opacity: 0.8,
    overflow: "hidden",
  },
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 1,
  },
  timeText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
