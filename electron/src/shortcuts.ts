export type ShortcutAction =
  | "run"
  | "scan"
  | "open_source"
  | "open_output"
  | "clear"
  | "settings"
  | "extensions"
  | "shortcuts"
  | "exit";

export interface Shortcut {
  code: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  chord?: Shortcut;
}

export type ShortcutMap = Record<ShortcutAction, Shortcut>;

export const SHORTCUT_DEFAULTS: ShortcutMap = {
  run: { code: "KeyR", ctrl: true, shift: false, alt: false },
  scan: { code: "KeyS", ctrl: true, shift: false, alt: false },
  open_source: { code: "KeyO", ctrl: true, shift: false, alt: false },
  open_output: { code: "KeyO", ctrl: true, shift: true, alt: false },
  clear: { code: "KeyL", ctrl: true, shift: false, alt: false },
  settings: { code: "Comma", ctrl: true, shift: false, alt: false },
  extensions: { code: "KeyX", ctrl: true, shift: true, alt: false },
  shortcuts: {
    code: "KeyK",
    ctrl: true,
    shift: false,
    alt: false,
    chord: { code: "KeyS", ctrl: true, shift: false, alt: false },
  },
  exit: { code: "KeyQ", ctrl: true, shift: false, alt: false },
};

const KEY_NAMES: Record<string, string> = {
  Space: "Space",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "Backspace",
  Escape: "Esc",
  ControlLeft: "Ctrl",
  ControlRight: "Ctrl",
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  AltLeft: "Alt",
  AltRight: "Alt",
  MetaLeft: "Win",
  MetaRight: "Win",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  BracketLeft: "[",
  BracketRight: "]",
  Equal: "=",
  Minus: "-",
  Backquote: "`",
  IntlBackslash: "`",
  NumpadEnter: "Enter",
};

export function keyLabel(code: string): string {
  if (!code) return "";
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith("Key")) return code.slice(3).toUpperCase();
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "Num " + code.slice(6);
  if (code.startsWith("F") && /^F\d+$/.test(code)) return code;
  return code;
}

export function shortcutLabel(s: Shortcut): string {
  const parts: string[] = [];
  if (s.ctrl) parts.push("Ctrl");
  if (s.alt) parts.push("Alt");
  if (s.shift) parts.push("Shift");
  parts.push(keyLabel(s.code));
  return parts.join("+");
}

export function comboLabel(s: Shortcut): string {
  const first = shortcutLabel(s);
  return s.chord ? `${first} ${shortcutLabel(s.chord)}` : first;
}

const MODIFIER_CODES = new Set([
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
  "CapsLock",
  "NumLock",
]);

export function shortcutFromEvent(e: KeyboardEvent): Shortcut | null {
  if (!e.code || MODIFIER_CODES.has(e.code)) return null;
  return { code: e.code, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey };
}

export function shortcutMatches(s: Shortcut, e: KeyboardEvent): boolean {
  return (
    !!s.code &&
    s.code === e.code &&
    s.ctrl === e.ctrlKey &&
    s.shift === e.shiftKey &&
    s.alt === e.altKey
  );
}

const KEY = "repoprep.shortcuts";

function isShortcut(x: unknown): x is Shortcut {
  return (
    !!x &&
    typeof (x as Shortcut).code === "string" &&
    typeof (x as Shortcut).ctrl === "boolean" &&
    typeof (x as Shortcut).shift === "boolean" &&
    typeof (x as Shortcut).alt === "boolean"
  );
}

export function loadShortcuts(): ShortcutMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...SHORTCUT_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<ShortcutMap>;
    const out = { ...SHORTCUT_DEFAULTS };
    for (const k of Object.keys(SHORTCUT_DEFAULTS) as ShortcutAction[]) {
      const v = parsed[k];
      if (isShortcut(v)) {
        const chord = v.chord && isShortcut(v.chord) ? v.chord : undefined;
        out[k] = { code: v.code, ctrl: v.ctrl, shift: v.shift, alt: v.alt, ...(chord ? { chord } : {}) };
      }
    }
    return out;
  } catch {
    return { ...SHORTCUT_DEFAULTS };
  }
}

export function saveShortcuts(s: ShortcutMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}