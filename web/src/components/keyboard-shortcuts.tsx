"use client";

import { useEffect } from "react";
import { createNoteAction } from "@/lib/notes-actions";

export function KeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Cmd/Ctrl+N: Create new note
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        await createNoteAction();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
