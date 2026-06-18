/**
 * Zustand store for the right rail (slide-in detail panel).
 *
 * Usage:
 *   const { open, close, isOpen, activeTab } = useRightRailStore()
 *   open({ tab: 'alerts', itemId: 'inv-123' })  // open to a specific tab
 *   close()
 */
"use client";

import { create } from "zustand";

export type RightRailTab = "alerte" | "ai" | "dovezi" | "istoric";

interface RightRailState {
  isOpen: boolean;
  activeTab: RightRailTab;
  /** ID of the invoice/line currently driving the rail context */
  selectedItemId: string | null;
}

interface RightRailActions {
  open: (opts?: { tab?: RightRailTab; itemId?: string }) => void;
  close: () => void;
  setTab: (tab: RightRailTab) => void;
  setSelectedItemId: (id: string | null) => void;
}

export const useRightRailStore = create<RightRailState & RightRailActions>((set) => ({
  isOpen: false,
  activeTab: "alerte",
  selectedItemId: null,

  open: ({ tab, itemId } = {}) =>
    set((s) => ({
      isOpen: true,
      activeTab: tab ?? s.activeTab,
      selectedItemId: itemId ?? s.selectedItemId,
    })),

  close: () => set({ isOpen: false }),

  setTab: (tab) => set({ activeTab: tab }),

  setSelectedItemId: (id) => set({ selectedItemId: id }),
}));
