"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useStompClient } from "@/hooks/useStompClient";
import { useBalance } from "@/hooks/useBalance";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface SettlementPayload {
  marketId: string;
  marketName: string;
  winningOutcome: string;
  settledBets: {
    userId: string;
    username: string;
    status: "WON" | "LOST";
    potentialWin: number;
  }[];
}

export function SettlementListener() {
  const { data: session } = useSession();
  const { subscribe } = useStompClient();
  const { refetchBalance } = useBalance();
  const t = useTranslations("settlement");

  useEffect(() => {
    const unsub = subscribe("/topic/settlements", (data) => {
      const payload = data as SettlementPayload;

      if (!session?.user?.id) return;

      const myBet = payload.settledBets.find((b) => b.userId === session.user.id);
      if (!myBet) return;

      // Refresh balance from server after any settlement affecting us
      refetchBalance();

      if (myBet.status === "WON") {
        toast.success(`${payload.marketName}`, {
          description: t("won", { amount: myBet.potentialWin.toFixed(0) }),
          duration: 8000,
        });
      } else {
        toast(`${payload.marketName}`, {
          description: t("lost", { outcome: payload.winningOutcome }),
          duration: 6000,
        });
      }
    });

    return () => unsub?.();
  }, [subscribe, session?.user?.id, refetchBalance, t]);

  return null;
}
