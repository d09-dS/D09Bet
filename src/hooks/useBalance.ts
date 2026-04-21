"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import { useCallback } from "react";

interface UserMe {
  tokenBalance: number;
}

function balanceKey(userId: string | undefined) {
  return ["balance", userId] as const;
}

/**
 * Central hook for the user's token balance.
 * Fetches from /api/users/me and keeps React-Query cache as single source of truth.
 * Uses the user ID in the query key so the cache resets on logout / re-login.
 */
export function useBalance() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const token = session?.user?.accessToken;
  const userId = session?.user?.id;

  const { data: balance } = useQuery({
    queryKey: balanceKey(userId),
    queryFn: async () => {
      const user = await api.get<UserMe>("/users/me", token!);
      return Number(user.tokenBalance);
    },
    enabled: !!token,
    // placeholderData is shown while loading but never persisted in cache,
    // so a stale value from a previous session cannot stick around.
    placeholderData: session?.user?.tokenBalance != null ? Number(session.user.tokenBalance) : undefined,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  /** Optimistically set a known balance (e.g. returned from bet API). */
  const setBalance = useCallback(
    (newBalance: number) => {
      queryClient.setQueryData(balanceKey(userId), newBalance);
    },
    [queryClient, userId],
  );

  /** Refetch balance from server (e.g. after settlement). */
  const refetchBalance = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: balanceKey(userId) });
  }, [queryClient, userId]);

  return { balance: balance ?? null, setBalance, refetchBalance };
}
