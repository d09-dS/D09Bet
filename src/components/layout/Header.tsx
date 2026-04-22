"use client";

import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Coins,
  Menu,
  User,
  LogOut,
  Settings,
  TicketCheck,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useBalance } from "@/hooks/useBalance";

export function Header() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const { data: session } = useSession();
  const { balance } = useBalance();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/events" as const, label: t("events") },
    { href: "/leaderboard" as const, label: t("leaderboard") },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 ">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center opacity-90 hover:opacity-100 transition-opacity"
        >
          <Image
            src="/dotbet_logo.png"
            alt="dotBet"
            width={110}
            height={36}
            className="h-9 w-auto min-w-27.5 object-contain"
            priority
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground rounded-lg hover:bg-white/[0.04]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          {session?.user ? (
            <>
              {/* Token Balance */}
              <div className="hidden items-center gap-1.5 rounded-full bg-primary/[0.08] border border-primary/20 px-3.5 py-1.5 sm:flex">
                <Coins className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-bold text-primary">
                  {balance?.toFixed(0)}
                </span>
              </div>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-9 w-9 border border-border hover:border-primary/50 transition-colors"
                    />
                  }
                >
                  <User className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 mt-2">
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-bold">{session.user.name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Coins className="h-3 w-3 text-primary" />
                      {balance?.toFixed(0)} {tCommon("tokens")}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/profile" />}>
                    <User className="mr-2 h-4 w-4" />
                    {t("profile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/settings" />}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t("settings")}
                  </DropdownMenuItem>
                  {(session.user.role === "ADMIN" ||
                    session.user.role === "MODERATOR") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem render={<Link href="/admin" />}>
                        <Settings className="mr-2 h-4 w-4" />
                        {t("admin")}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-red-400 focus:text-red-400"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden gap-2 sm:flex">
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t("login")}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="rounded-lg">
                  {t("register")}
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Nav — animated */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <nav className="flex flex-col gap-1 p-4">
              {session?.user && (
                <div className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    {session.user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">
                      {session.user.name}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-primary">
                      <Coins className="h-3 w-3" />
                      {balance?.toFixed(0)} {tCommon("tokens")}
                    </p>
                  </div>
                </div>
              )}
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-white/[0.04] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              {session?.user ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-white/[0.04]"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    {t("profile")}
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-white/[0.04]"
                  >
                    <TicketCheck className="h-4 w-4 text-muted-foreground" />
                    {t("myBets")}
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-white/[0.04]"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    {t("settings")}
                  </Link>
                  {(session.user.role === "ADMIN" ||
                    session.user.role === "MODERATOR") && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-white/[0.04]"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      {t("admin")}
                    </Link>
                  )}
                  <div className="my-1 h-px bg-border/30" />
                  <button
                    onClick={() => {
                      signOut();
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/[0.06] transition-colors w-full text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("logout")}
                  </button>
                </>
              ) : (
                <div className="flex gap-2 mt-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full">
                      {t("login")}
                    </Button>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1"
                  >
                    <Button className="w-full">{t("register")}</Button>
                  </Link>
                </div>
              )}
              <div className="mt-3 flex justify-center items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
