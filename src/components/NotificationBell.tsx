"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Bell, UserPlus, Trophy, Megaphone, Info, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { Link } from "@/i18n/navigation";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationPage {
  content: Notification[];
  totalElements: number;
}

const ICON_MAP: Record<string, typeof UserPlus> = {
  USER_REGISTERED: UserPlus,
  BET_PLACED: Trophy,
  EVENT_CREATED: Trophy,
  EVENT_SETTLED: Megaphone,
  SYSTEM: Info,
};

export function NotificationBell() {
  const { data: session } = useSession();
  const t = useTranslations("notifications");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const token = session?.user?.accessToken as string | undefined;
  const isAdmin = session?.user?.role === "ADMIN";

  const fetchNotifications = useCallback(async () => {
    if (!token || !isAdmin) return;
    try {
      const data = await api.get<NotificationPage>(
        "/admin/notifications?size=10",
        token,
      );
      setNotifications(data.content);
      setUnreadCount(data.content.filter((n) => !n.isRead).length);
    } catch {
      // silently ignore
    }
  }, [token, isAdmin]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    if (!token) return;
    try {
      await api.patch("/admin/notifications", {}, token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silently ignore
    }
  };

  const markOneRead = async (id: number) => {
    if (!token) return;
    try {
      await api.patch(`/admin/notifications/${id}/read`, {}, token);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silently ignore
    }
  };

  if (!isAdmin) return null;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return t("justNow");
    if (diffMin < 60) return t("minutesAgo", { count: diffMin });
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return t("hoursAgo", { count: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    return t("daysAgo", { count: diffDays });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full h-9 w-9 border border-border hover:border-primary/50 transition-colors"
          />
        }
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 mt-2">
        <div className="flex items-center justify-between px-3 py-2.5">
          <p className="text-sm font-bold">{t("title")}</p>
          {unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                markAllRead();
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Check className="h-3 w-3" />
              {t("markAllRead")}
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t("noNotifications")}
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => {
              const Icon = ICON_MAP[notification.type] || Info;
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer ${!notification.isRead ? "bg-primary/[0.04]" : ""}`}
                  onClick={() => {
                    if (!notification.isRead) markOneRead(notification.id);
                  }}
                  render={
                    notification.entityType === "USER" ? (
                      <Link href={{ pathname: "/admin", query: { tab: "users" } }} />
                    ) : notification.entityType === "EVENT" ? (
                      <Link href={{ pathname: "/admin", query: { tab: "events" } }} />
                    ) : undefined
                  }
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${!notification.isRead ? "text-primary" : "text-muted-foreground"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-snug ${!notification.isRead ? "font-semibold" : ""}`}
                    >
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
