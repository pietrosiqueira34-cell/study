export type Theme = "dark" | "light";

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }
  try { localStorage.setItem("ls_theme", theme); } catch { /* noop */ }
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const v = localStorage.getItem("ls_theme");
    if (v === "light" || v === "dark") return v;
  } catch { /* noop */ }
  return "dark";
}
