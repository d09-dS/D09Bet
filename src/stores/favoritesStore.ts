"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavoritesState {
  ids: string[];
  toggleFavorite: (eventId: string) => void;
  isFavorite: (eventId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggleFavorite: (eventId) =>
        set((state) => ({
          ids: state.ids.includes(eventId)
            ? state.ids.filter((id) => id !== eventId)
            : [...state.ids, eventId],
        })),
      isFavorite: (eventId) => get().ids.includes(eventId),
    }),
    { name: "dotbet-favorites" }
  )
);
