/**
 * Zustand store for sidebar open/collapsed state.
 * Persisted to localStorage so the preference survives page refreshes.
 */
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  /** true = expanded (220px), false = collapsed icon-only (64px) */
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isOpen: true,
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
    }),
    { name: "fc-sidebar" },
  ),
);
