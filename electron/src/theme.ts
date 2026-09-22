export type Theme = "light" | "dark" | "system";

const THEME_KEY = "repoprep.theme";

const media = (): MediaQueryList | null =>
  typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

export function resolveTheme(t: Theme): "light" | "dark" {
  if (t === "system") {
    const mq = media();
    return mq && mq.matches ? "dark" : "light";
  }
  return t;
}

export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = resolveTheme(t);
}

export function watchSystem(cb: () => void): () => void {
  const mq = media();
  if (!mq) return () => undefined;
  const listener = () => cb();
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}

export function loadTheme(): Theme {
  const v = localStorage.getItem(THEME_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export function saveTheme(t: Theme): void {
  localStorage.setItem(THEME_KEY, t);
}