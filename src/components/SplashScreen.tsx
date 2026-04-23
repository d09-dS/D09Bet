"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Casino chip (inline SVG, same as logo) ── */
function Chip({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-26 -26 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="0" cy="0" r="22" fill="#5B3D7A" />
      {Array.from({ length: 8 }).map((_, i) => (
        <rect
          key={i}
          x="-3"
          y="-22"
          width="6"
          height="8"
          rx="1.5"
          fill="#E84D8A"
          transform={`rotate(${i * 45} 0 0)`}
        />
      ))}
      <circle cx="0" cy="0" r="15" fill="#6B4D8A" />
      {Array.from({ length: 8 }).map((_, i) => (
        <circle
          key={i}
          cx="0"
          cy="-12"
          r="2"
          fill="#C8D94A"
          transform={`rotate(${i * 45} 0 0)`}
        />
      ))}
      <circle cx="0" cy="0" r="8" fill="#D4E157" />
      <circle
        cx="0"
        cy="0"
        r="6"
        fill="none"
        stroke="#5B3D7A"
        strokeWidth="0.8"
        opacity="0.3"
      />
    </svg>
  );
}

/* ── The actual splash overlay ── */
function SplashOverlay({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"roll" | "reveal" | "exit">("roll");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 900);
    const t2 = setTimeout(() => setPhase("exit"), 2200);
    const t3 = setTimeout(onComplete, 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "#07090D" }}
      animate={phase === "exit" ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Subtle radial glow behind the logo */}
      <div
        className="absolute rounded-full blur-3xl opacity-20"
        style={{
          width: 400,
          height: 400,
          background:
            "radial-gradient(circle, rgba(77,217,192,0.4) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex items-center gap-0">
        {/* "d" letter — fades in after chip passes */}
        <motion.span
          className="text-6xl md:text-8xl font-extrabold select-none"
          style={{
            fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
            color: "#4DD9C0",
          }}
          initial={{ opacity: 0, x: -20 }}
          animate={
            phase !== "roll"
              ? { opacity: 1, x: 0 }
              : { opacity: 0, x: -20 }
          }
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          d
        </motion.span>

        {/* Casino chip — rolls from left to center */}
        <motion.div
          className="relative"
          initial={{ x: -260, rotate: -720 }}
          animate={{ x: 0, rotate: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            animate={
              phase === "reveal"
                ? { scale: [1, 1.1, 1] }
                : {}
            }
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <Chip size={72} />
          </motion.div>
        </motion.div>

        {/* "tBet" letters — fade in after chip lands */}
        <motion.span
          className="text-6xl md:text-8xl font-extrabold select-none"
          style={{
            fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
            color: "#4DD9C0",
          }}
          initial={{ opacity: 0, x: 20 }}
          animate={
            phase !== "roll"
              ? { opacity: 1, x: 0 }
              : { opacity: 0, x: 20 }
          }
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
        >
          tBet
        </motion.span>
      </div>

      {/* Pink accent dot */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 8,
          height: 8,
          backgroundColor: "#E84D8A",
          top: "calc(50% - 52px)",
          left: "calc(50% - 135px)",
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={
          phase !== "roll"
            ? { opacity: 1, scale: 1 }
            : { opacity: 0, scale: 0 }
        }
        transition={{ duration: 0.3, delay: 0.25 }}
      />
    </motion.div>
  );
}

/* ── Context: lets any component trigger the splash ── */
const SplashContext = createContext<{ triggerSplash: () => void }>({
  triggerSplash: () => {},
});

export function useSplash() {
  return useContext(SplashContext);
}

/* ── Public wrapper: shows splash once per session ── */
const SPLASH_KEY = "dotbet_splash_shown";

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem(SPLASH_KEY);
    const loginSplash = sessionStorage.getItem("dotbet_login_splash");
    const logoutSplash = sessionStorage.getItem("dotbet_logout_splash");

    if (loginSplash) {
      sessionStorage.removeItem("dotbet_login_splash");
      setShowSplash(true);
    } else if (logoutSplash) {
      sessionStorage.removeItem("dotbet_logout_splash");
      setShowSplash(true);
    } else if (!alreadyShown) {
      setShowSplash(true);
    }
    setReady(true);
  }, []);

  const handleComplete = useCallback(() => {
    sessionStorage.setItem(SPLASH_KEY, "1");
    setShowSplash(false);
  }, []);

  const triggerSplash = useCallback(() => {
    setShowSplash(true);
  }, []);

  // Prevent flash: don't render children until we know whether to show splash
  if (!ready) {
    return (
      <div
        className="fixed inset-0 z-[9999]"
        style={{ backgroundColor: "#07090D" }}
      />
    );
  }

  return (
    <SplashContext.Provider value={{ triggerSplash }}>
      <AnimatePresence>{showSplash && <SplashOverlay onComplete={handleComplete} />}</AnimatePresence>
      {children}
    </SplashContext.Provider>
  );
}
