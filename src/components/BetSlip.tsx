"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useBetSlipStore } from "@/stores/betSlipStore";
import { api } from "@/lib/api";
import { translateApiError } from "@/lib/translate-api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Trash2, Ticket, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useBalance } from "@/hooks/useBalance";

export default function BetSlip() {
  const t = useTranslations("events");
  const tBets = useTranslations("bets");
  const tCommon = useTranslations("common");
  const tApiErrors = useTranslations("apiErrors");
  const { data: session } = useSession();
  const { items, isOpen, removeItem, updateStake, clearSlip, toggleOpen, setOpen } = useBetSlipStore();
  const { balance, setBalance } = useBalance();
  const [placing, setPlacing] = useState<string | null>(null);
  const [buzz, setBuzz] = useState(false);
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  // Close panel on route change
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      setOpen(false);
      prevPathname.current = pathname;
    }
  }, [pathname, setOpen]);

  // Reminder buzz every 15 seconds when there are unplaced bets
  const triggerBuzz = useCallback(() => {
    setBuzz(true);
    setTimeout(() => setBuzz(false), 600);
  }, []);

  useEffect(() => {
    if (items.length === 0 || isOpen) return;
    const interval = setInterval(triggerBuzz, 15_000);
    return () => clearInterval(interval);
  }, [items.length, isOpen, triggerBuzz]);

  const totalStake = items.reduce((sum, item) => sum + item.stake, 0);
  const totalPotentialWin = items.reduce((sum, item) => sum + item.stake * item.odds, 0);
  const remainingBalance = balance != null ? Math.max(0, balance - totalStake) : null;
  const overBudget = balance != null && totalStake > balance;

  function availableForItem(outcomeId: string): number {
    if (balance == null) return 0;
    const othersStake = items
      .filter((i) => i.outcomeId !== outcomeId)
      .reduce((sum, i) => sum + i.stake, 0);
    return Math.max(0, Math.floor(balance - othersStake));
  }

  async function placeBet(outcomeId: string, stake: number) {
    if (!session?.user?.accessToken || stake <= 0) return;

    setPlacing(outcomeId);
    try {
      const res = await api.post<{ newBalance: number }>("/bets", { outcomeId, stake }, session.user.accessToken);
      setBalance(res.newBalance);
      removeItem(outcomeId);
      toast.success(tBets("betPlaced"), { description: `${stake} ${tCommon("tokens")}` });
      window.dispatchEvent(new Event("bet-placed"));
    } catch (err: unknown) {
      const message = translateApiError(err, tApiErrors);
      toast.error(tCommon("error"), { description: message });
    } finally {
      setPlacing(null);
    }
  }

  async function placeAllBets() {
    for (const item of items) {
      await placeBet(item.outcomeId, item.stake);
    }
    setOpen(false);
  }

  if (!session) return null;

  return (
    <>
      {/* Floating toggle button with coral glow */}
      <AnimatePresence>
        {!isOpen && items.length > 0 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              ...(buzz ? { rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1.12, 1] } : {}),
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={buzz ? { duration: 0.5, ease: "easeInOut" } : undefined}
            onClick={toggleOpen}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground font-semibold transition-transform hover:scale-105"
          >
            <Ticket className="h-5 w-5" />
            <span className="font-bold">{items.length}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Slide-out panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm sm:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-background border-l border-border flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/30 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <Ticket className="h-5 w-5 text-primary" />
                  <h2 className="font-bold">{t("placeBet")} ({items.length})</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg" aria-label="Close bet slip">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {items.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">{tBets("noBets")}</p>
                ) : (
                  items.map((item) => {
                    const maxForThis = availableForItem(item.outcomeId);
                    const itemOverBudget = balance != null && item.stake > maxForThis;
                    return (
                    <div key={item.outcomeId} className={`rounded-xl border p-4 space-y-3 ${itemOverBudget ? "border-destructive/50 bg-destructive/5" : "border-border/50 bg-secondary/20"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.eventTitle}</p>
                          <p className="text-xs text-muted-foreground">{item.marketName}</p>
                          <p className="text-sm font-bold text-primary mt-0.5">{item.outcomeName}</p>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-1">
                          <span className="text-xl font-extrabold text-primary">{item.odds.toFixed(2)}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => removeItem(item.outcomeId)} aria-label="Remove bet">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={maxForThis}
                          value={item.stake || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateStake(item.outcomeId, val);
                          }}
                          className={`h-11 text-sm rounded-xl border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all [&:not(:placeholder-shown)]:bg-white [&:not(:placeholder-shown)]:text-[#0A0E13] [&:not(:placeholder-shown)]:border-white/30 ${itemOverBudget ? "bg-destructive/10" : "bg-secondary/50"}`}
                          placeholder={t("stake")}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          → {(item.stake * item.odds).toFixed(1)}
                        </span>
                      </div>
                      {itemOverBudget && (
                        <p className="text-xs text-destructive">
                          {tBets("maxAvailable", { amount: maxForThis })}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5">
                        {[5, 10, 25, 50].map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            disabled={amount > maxForThis}
                            onClick={() => updateStake(item.outcomeId, amount)}
                            className={`h-7 px-2.5 text-xs font-medium rounded border transition-colors ${
                              amount > maxForThis
                                ? "border-border/30 text-muted-foreground/40 cursor-not-allowed"
                                : item.stake === amount
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                            }`}
                          >
                            {amount}
                          </button>
                        ))}
                        {balance != null && (
                          <button
                            type="button"
                            disabled={maxForThis <= 0}
                            onClick={() => updateStake(item.outcomeId, maxForThis)}
                            className={`h-7 px-2.5 text-xs font-medium rounded border transition-colors ${
                              maxForThis <= 0
                                ? "border-border/30 text-muted-foreground/40 cursor-not-allowed"
                                : item.stake === maxForThis
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                            }`}
                          >
                            Max
                          </button>
                        )}
                        <div className="flex-1" />
                        <Button
                          size="sm"
                          className="h-7 shrink-0 rounded-lg text-xs"
                          disabled={item.stake <= 0 || itemOverBudget || placing === item.outcomeId}
                          onClick={() => placeBet(item.outcomeId, item.stake)}
                        >
                          {placing === item.outcomeId ? <Loader2 className="h-3 w-3 animate-spin" /> : t("placeBet")}
                        </Button>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>

              {/* Footer summary */}
              {items.length > 0 && (
                <div className="border-t border-border/30 p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("stake")}:</span>
                    <span className="font-bold">{totalStake.toFixed(0)} {tCommon("tokens")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("potentialWin")}:</span>
                    <span className="font-bold text-primary">{totalPotentialWin.toFixed(1)} {tCommon("tokens")}</span>
                  </div>
                  {remainingBalance != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{tBets("remaining")}:</span>
                      <span className={`font-bold ${overBudget ? "text-destructive" : "text-muted-foreground"}`}>
                        {overBudget ? "0" : remainingBalance.toFixed(0)} {tCommon("tokens")}
                      </span>
                    </div>
                  )}
                  {overBudget && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {tBets("insufficientBalance", { total: totalStake.toFixed(0), balance: balance != null ? Math.floor(balance).toString() : "0" })}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearSlip} className="flex-1 rounded-lg">
                      <Trash2 className="mr-1 h-3 w-3" /> {tCommon("delete")}
                    </Button>
                    <Button size="sm" onClick={placeAllBets} className="flex-1 rounded-lg" disabled={totalStake <= 0 || overBudget}>
                      {t("placeBet")}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
