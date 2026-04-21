"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface ThemeCtx {
  theme: string;
  setTheme: (t: string) => void;
  resolvedTheme: string;
  themes: string[];
  systemTheme?: string;
}

const Ctx = createContext<ThemeCtx>({
  theme: "dark",
  setTheme: () => {},
  resolvedTheme: "dark",
  themes: ["light", "dark"],
});

export const useTheme = () => useContext(Ctx);

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  attribute = "class",
  storageKey = "theme",
}: {
  children: React.ReactNode;
  defaultTheme?: string;
  attribute?: string;
  storageKey?: string;
  enableSystem?: boolean;
  enableColorScheme?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  const [theme, rawSet] = useState<string>(defaultTheme);

  // Sync from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) rawSet(stored);
    } catch {}
  }, [storageKey]);

  // Apply class/attribute to <html> whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (attribute === "class") {
      root.classList.remove("light", "dark");
      root.classList.add(theme);
    } else {
      root.setAttribute(attribute, theme);
    }
    root.style.colorScheme = theme;
  }, [theme, attribute]);

  const setTheme = useCallback(
    (next: string) => {
      rawSet(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {}
    },
    [storageKey],
  );

  return (
    <Ctx.Provider value={{ theme, setTheme, resolvedTheme: theme, themes: ["light", "dark"] }}>
      {children}
    </Ctx.Provider>
  );
}
