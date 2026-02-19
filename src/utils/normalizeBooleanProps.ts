/**
 * Normalize string "true"/"false" → boolean to prevent the Android Fabric
 * renderer from crashing with:
 *   "java.lang.String cannot be cast to java.lang.Boolean"
 *
 * Strategy: patch ALL prop-passing entry points (createElement, jsx, jsxs,
 * jsxDEV) so that any prop whose value is the string "true" or "false" is
 * coerced to a real boolean BEFORE it reaches the native bridge.
 */

import React from "react";

// Convert every string "true"/"false" in props to a real boolean.
// We intentionally do NOT restrict to a whitelist because the offending prop
// may live deep inside a third-party library or generated native code.
function patchProps(
  props: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null | undefined {
  if (!props || typeof props !== "object") return props;

  let patched: Record<string, unknown> | null = null;

  for (const key in props) {
    const raw = props[key];
    if (typeof raw !== "string") continue;

    const lower = raw.trim().toLowerCase();
    let bool: boolean | undefined;
    if (lower === "true") bool = true;
    else if (lower === "false") bool = false;
    else continue;

    if (patched === null) patched = { ...props };
    patched[key] = bool;

    if (__DEV__) {
      console.warn(
        `[normalizeBooleanProps] Coerced string "${raw}" → ${bool} for prop "${key}"`,
      );
    }
  }

  return patched ?? props;
}

// --- 1. Patch React.createElement (legacy / explicit calls) ---
const origCE = React.createElement;
(React as any).createElement = (type: any, props: any, ...children: any[]) =>
  origCE(type, patchProps(props) as any, ...children);

// --- 2. Patch react/jsx-runtime & react/jsx-dev-runtime ---
function patchJsxExports(mod: any, label: string) {
  if (!mod) return;
  if (typeof mod.jsx === "function") {
    const orig = mod.jsx;
    mod.jsx = (type: any, props: any, key: any) =>
      orig(type, patchProps(props), key);
  }
  if (typeof mod.jsxs === "function") {
    const orig = mod.jsxs;
    mod.jsxs = (type: any, props: any, key: any) =>
      orig(type, patchProps(props), key);
  }
  if (typeof mod.jsxDEV === "function") {
    const orig = mod.jsxDEV;
    mod.jsxDEV = (
      type: any, props: any, key: any,
      isStatic: any, source: any, self: any,
    ) => orig(type, patchProps(props), key, isStatic, source, self);
  }
  if (__DEV__) {
    console.log(`[normalizeBooleanProps] Patched ${label}`);
  }
}

try { patchJsxExports(require("react/jsx-runtime"), "react/jsx-runtime"); } catch { /* noop */ }
try { patchJsxExports(require("react/jsx-dev-runtime"), "react/jsx-dev-runtime"); } catch { /* noop */ }

if (__DEV__) {
  console.log("[normalizeBooleanProps] Module loaded");
}
