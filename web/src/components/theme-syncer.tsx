"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

/**
 * Syncs the user's theme preference from the database to next-themes on mount.
 * This ensures cross-device theme persistence.
 */
export function ThemeSyncer({ theme }: { theme: string }) {
  const { setTheme } = useTheme();
  const synced = useRef(false);

  useEffect(() => {
    if (!synced.current) {
      setTheme(theme);
      synced.current = true;
    }
  }, [theme, setTheme]);

  return null;
}
