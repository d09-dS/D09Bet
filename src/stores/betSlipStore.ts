"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BetSlipItem {
  outcomeId: string;
  outcomeName: string;
  marketName: string;
  eventTitle: string;
  odds: number;
  stake: number;
}

interface BetSlipState {
  items: BetSlipItem[];
  isOpen: boolean;
  addItem: (item: Omit<BetSlipItem, "stake">) => void;
  removeItem: (outcomeId: string) => void;
  updateStake: (outcomeId: string, stake: number) => void;
  clearSlip: () => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
}

export const useBetSlipStore = create<BetSlipState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      addItem: (item) =>
        set((state) => {
          if (state.items.some((i) => i.outcomeId === item.outcomeId)) {
            return state;
          }
          return {
            items: [...state.items, { ...item, stake: 1 }],
            isOpen: true,
          };
        }),
      removeItem: (outcomeId) =>
        set((state) => ({
          items: state.items.filter((i) => i.outcomeId !== outcomeId),
        })),
      updateStake: (outcomeId, stake) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.outcomeId === outcomeId ? { ...i, stake } : i
          ),
        })),
      clearSlip: () => set({ items: [] }),
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setOpen: (open) => set({ isOpen: open }),
    }),
    {
      name: "dotbet-slip",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
