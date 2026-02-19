import React from "react";

const BOOLEAN_PROP_KEYS = new Set([
  "accessible",
  "adjustsFontSizeToFit",
  "allowFontScaling",
  "autoFocus",
  "blurOnSubmit",
  "collapsable",
  "disabled",
  "editable",
  "enabled",
  "focusable",
  "horizontal",
  "multiline",
  "refreshing",
  "scrollEnabled",
  "secureTextEntry",
  "selectable",
  "showSoftInputOnFocus",
  "showsHorizontalScrollIndicator",
  "showsVerticalScrollIndicator",
  "statusBarTranslucent",
  "transparent",
  "visible",
]);

const parseBooleanString = (value: string): boolean | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
};

const originalCreateElement = React.createElement;

React.createElement = ((type: unknown, props: unknown, ...children: unknown[]) => {
  if (!props || typeof props !== "object") {
    return originalCreateElement(type as never, props as never, ...children as never[]);
  }

  const originalProps = props as Record<string, unknown>;
  let patchedProps: Record<string, unknown> = originalProps;

  for (const [key, rawValue] of Object.entries(originalProps)) {
    if (typeof rawValue !== "string" || !BOOLEAN_PROP_KEYS.has(key)) continue;

    const parsed = parseBooleanString(rawValue);
    if (parsed === null) continue;

    if (patchedProps === originalProps) {
      patchedProps = { ...originalProps };
    }

    patchedProps[key] = parsed;
  }

  return originalCreateElement(type as never, patchedProps as never, ...children as never[]);
}) as typeof React.createElement;
