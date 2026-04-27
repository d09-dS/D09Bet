"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { translateApiError } from "@/lib/translate-api-error";
import {
  BetEvent,
  User,
  PageResponse,
  EventStatus,
  Market,
  Category,
  PendingProfileChange,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DateTimeInput } from "@/components/ui/date-time-input";
import { toast } from "sonner";
import {
  Shield,
  Users,
  Settings,
  ScrollText,
  Coins,
  Plus,
  Pencil,
  Trophy,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
  List,
  UserPlus,
  Target,
  Calendar,
  TrendingUp,
  UserCheck,
} from "lucide-react";

type AdminTab = "events" | "users" | "settings" | "audit" | "odds";

interface AuditEntry {
  id: string;
  admin: { username: string };
  action: string;
  entityType: string;
  entityId: string;
  details: unknown;
  eventTitle: string | null;
  createdAt: string;
}

interface OddsLogEntry {
  id: number;
  eventId: string;
  eventTitle: string;
  marketName: string;
  outcomeName: string;
  oldOdds: number;
  newOdds: number;
  triggerType: string;
  changedBy: string | null;
  changedAt: string;
}

interface SystemSetting {
  key: string;
  value: string;
  description: string;
}

const STATUS_FLOW: Record<string, string[]> = {
  DRAFT: ["OPEN", "CANCELED"],
  OPEN: ["CLOSED", "CANCELED"],
  CLOSED: ["SETTLED", "CANCELED"],
  SETTLED: [],
  CANCELED: [],
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/20 text-gray-400",
  OPEN: "bg-green-500/20 text-green-400",
  CLOSED: "bg-yellow-500/20 text-yellow-400",
  SETTLED: "bg-purple-500/20 text-purple-400",
  CANCELED: "bg-red-500/20 text-red-400",
};

export default function AdminPage() {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tEvents = useTranslations("events");
  const tAdmin = useTranslations("admin");
  const tApiErrors = useTranslations("apiErrors");
  const locale = useLocale();
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const validTabs: AdminTab[] = ["events", "users", "settings", "audit", "odds"];
  const tabParam = searchParams.get("tab") as AdminTab | null;
  const initialTab = tabParam && validTabs.includes(tabParam) ? tabParam : "events";

  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  // Sync tab state when URL search params change
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);
  const [events, setEvents] = useState<BetEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingProfileChange[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState<string | null>(null);
  const [auditCategory, setAuditCategory] = useState<string | null>(null);
  const [auditSubTab, setAuditSubTab] = useState<"activity" | "categories">("activity");
  const [categoryAuditLogs, setCategoryAuditLogs] = useState<Record<string, AuditEntry[]>>({});
  const [oddsLog, setOddsLog] = useState<OddsLogEntry[]>([]);
  const [oddsEventFilter, setOddsEventFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Event CRUD
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    titleEn: "",
    description: "",
    descriptionEn: "",
    endTime: "",
    categoryId: "",
  });
  const [newOutcomes, setNewOutcomes] = useState([
    { name: "", odds: "2.00" },
    { name: "", odds: "2.00" },
  ]);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Market form
  const [marketForm, setMarketForm] = useState({
    name: "",
    nameEn: "",
    type: "WINNER",
    marginFactor: "0.95",
    virtualPool: "100",
  });
  const [outcomeRows, setOutcomeRows] = useState([
    { name: "", initialOdds: "2.00" },
    { name: "", initialOdds: "2.00" },
  ]);
  const [addingMarket, setAddingMarket] = useState(false);

  // Settlement
  const [settlingMarket, setSettlingMarket] = useState<string | null>(null);

  // Token adjust
  const [tokenDialog, setTokenDialog] = useState<{
    userId: string;
    username: string;
  } | null>(null);
  const [tokenAmount, setTokenAmount] = useState("");
  const [tokenReason, setTokenReason] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.accessToken) {
      router.push("/login");
      return;
    }
    if (session.user.role !== "ADMIN") {
      router.push("/");
      return;
    }
    // Load categories for event creation form
    api
      .get<Category[]>("/events/categories")
      .then(setCategories)
      .catch(() => {});
  }, [session, status, router]);

  const loadTabData = useCallback(async () => {
    if (!session?.user?.accessToken) return;
    const token = session.user.accessToken;
    setLoading(true);
    try {
      if (activeTab === "events" || activeTab === "odds") {
        const data = await api.get<PageResponse<BetEvent>>(
          "/events?size=50&include=markets",
          token,
        );
        setEvents(data.content);
      }
      if (activeTab === "events") {
        // events already loaded above
      } else if (activeTab === "users" && session.user.role === "ADMIN") {
        const data = await api.get<PageResponse<User>>(
          "/admin/users?size=50",
          token,
        );
        setUsers(data.content);
      } else if (activeTab === "settings" && session.user.role === "ADMIN") {
        const [data, changes] = await Promise.all([
          api.get<SystemSetting[]>("/admin/settings", token),
          api.get<PendingProfileChange[]>("/admin/profile-changes?status=PENDING", token),
        ]);
        setSettings(data);
        setPendingChanges(changes);
      } else if (activeTab === "audit" && session.user.role === "ADMIN") {
        if (auditSubTab === "activity") {
          const params = new URLSearchParams({ size: "100" });
          if (auditFilter) params.set("action", auditFilter);
          if (auditCategory) params.set("category", auditCategory);
          const data = await api.get<PageResponse<AuditEntry>>(
            `/admin/audit-log?${params}`,
            token,
          );
          setAuditLog(data.content);
        } else {
          // Load recent entries per category
          const results: Record<string, AuditEntry[]> = {};
          await Promise.all(
            categories.map(async (cat) => {
              const data = await api.get<PageResponse<AuditEntry>>(
                `/admin/audit-log?size=10&action=CREATE_EVENT,CHANGE_EVENT_STATUS&category=${encodeURIComponent(cat.name)}`,
                token,
              );
              results[cat.name] = data.content;
            }),
          );
          setCategoryAuditLogs(results);
        }
      } else if (activeTab === "odds" && session.user.role === "ADMIN") {
        const params = new URLSearchParams({ size: "100" });
        if (oddsEventFilter) params.set("eventId", oddsEventFilter);
        const data = await api.get<PageResponse<OddsLogEntry>>(
          `/admin/odds-log?${params}`,
          token,
        );
        setOddsLog(data.content);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [activeTab, session, auditFilter, auditCategory, auditSubTab, oddsEventFilter]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  const tok = session?.user?.accessToken || "";

  // ── Event CRUD ──
  async function handleCreateEvent() {
    if (!tok || !newEvent.title) return;
    if (!newEvent.endTime) {
      toast.error(tAdmin("endRequired"));
      return;
    }
    if (newOutcomes.some((o) => !o.name)) {
      toast.error(tAdmin("fillAllOutcomes"));
      return;
    }
    setCreatingEvent(true);
    try {
      // 1. Create event with category
      const created = await api.post<BetEvent>(
        "/events",
        {
          title: newEvent.title,
          titleEn: newEvent.titleEn || undefined,
          description: newEvent.description || undefined,
          descriptionEn: newEvent.descriptionEn || undefined,
          categoryId: newEvent.categoryId
            ? Number(newEvent.categoryId)
            : undefined,
          endTime: newEvent.endTime
            ? new Date(newEvent.endTime).toISOString()
            : undefined,
        },
        tok,
      );
      // 2. Automatically create a market with the outcomes
      if (newOutcomes.length >= 2 && newOutcomes.every((o) => o.name)) {
        await api.post(
          `/events/${created.id}/markets`,
          {
            name: newEvent.title,
            nameEn: newEvent.titleEn || undefined,
            type: "CUSTOM",
            marginFactor: 0.95,
            virtualPool: 100,
            outcomes: newOutcomes.map((o, i) => ({
              name: o.name,
              initialOdds: parseFloat(o.odds) || 2.0,
              sortOrder: i,
            })),
          },
          tok,
        );
      }
      toast.success(tAdmin("eventCreated"));
      setNewEvent({
        title: "",
        titleEn: "",
        description: "",
        descriptionEn: "",
        endTime: "",
        categoryId: "",
      });
      setNewOutcomes([
        { name: "", odds: "2.00" },
        { name: "", odds: "2.00" },
      ]);
      setShowCreateForm(false);
      loadTabData();
    } catch (err: unknown) {
      toast.error(translateApiError(err, tApiErrors));
    } finally {
      setCreatingEvent(false);
    }
  }

  async function handleStatusChange(eventId: string, newStatus: EventStatus) {
    try {
      await api.patch(`/events/${eventId}/status`, { status: newStatus }, tok);
      toast.success(tAdmin("statusChanged", { status: newStatus }));
      loadTabData();
    } catch (err: unknown) {
      toast.error(translateApiError(err, tApiErrors));
    }
  }

  async function handleAddMarket(eventId: string) {
    if (!marketForm.name || outcomeRows.some((o) => !o.name)) {
      toast.error(tAdmin("fillAllFields"));
      return;
    }
    setAddingMarket(true);
    try {
      await api.post(
        `/events/${eventId}/markets`,
        {
          name: marketForm.name,
          nameEn: marketForm.nameEn || undefined,
          type: marketForm.type,
          marginFactor: parseFloat(marketForm.marginFactor),
          virtualPool: parseFloat(marketForm.virtualPool) || 100,
          outcomes: outcomeRows.map((o, i) => ({
            name: o.name,
            initialOdds: parseFloat(o.initialOdds),
            sortOrder: i,
          })),
        },
        tok,
      );
      toast.success(tAdmin("marketAdded"));
      setMarketForm({
        name: "",
        nameEn: "",
        type: "WINNER",
        marginFactor: "0.95",
        virtualPool: "100",
      });
      setOutcomeRows([
        { name: "", initialOdds: "2.00" },
        { name: "", initialOdds: "2.00" },
      ]);
      loadTabData();
    } catch (err: unknown) {
      toast.error(translateApiError(err, tApiErrors));
    } finally {
      setAddingMarket(false);
    }
  }

  async function handleSettle(marketId: string, winningOutcomeId: string) {
    setSettlingMarket(marketId);
    try {
      await api.post(
        `/admin/markets/${marketId}/settle`,
        { winningOutcomeId },
        tok,
      );
      toast.success(tAdmin("marketSettled"));
      loadTabData();
    } catch (err: unknown) {
      toast.error(translateApiError(err, tApiErrors));
    } finally {
      setSettlingMarket(null);
    }
  }

  // ── User management ──
  async function handleToggleActive(userId: string, isActive: boolean) {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive }, tok);
      toast.success(
        isActive ? tAdmin("userActivated") : tAdmin("userDeactivated"),
      );
      loadTabData();
    } catch (err: unknown) {
      toast.error(translateApiError(err, tApiErrors));
    }
  }

  async function handleUpdateRole(userId: string, role: string) {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role }, tok);
      toast.success(tAdmin("roleChanged"));
      loadTabData();
    } catch (err: unknown) {
      toast.error(translateApiError(err, tApiErrors));
    }
  }

  async function handleAdjustTokens() {
    if (!tokenDialog || !tokenAmount) return;
    try {
      await api.patch(
        `/admin/users/${tokenDialog.userId}/tokens`,
        {
          amount: parseFloat(tokenAmount),
          reason: tokenReason || tAdmin("adminAdjustment"),
        },
        tok,
      );
      toast.success(
        tAdmin("tokensAdjusted", { username: tokenDialog.username }),
      );
      setTokenDialog(null);
      setTokenAmount("");
      setTokenReason("");
      loadTabData();
    } catch (err: unknown) {
      toast.error(translateApiError(err, tApiErrors));
    }
  }

  // ── Settings ──
  async function handleUpdateSetting(key: string, value: string) {
    try {
      await api.put(`/admin/settings/${key}`, { value }, tok);
      toast.success(tAdmin("settingSaved"));
    } catch (err: unknown) {
      toast.error(translateApiError(err, tApiErrors));
    }
  }

  async function handleProfileChangeReview(id: string, action: "approve" | "reject") {
    try {
      await api.patch(`/admin/profile-changes/${id}`, { action }, tok);
      toast.success(action === "approve" ? tAdmin("profileChangeApproved") : tAdmin("profileChangeRejected"));
      setPendingChanges((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : tCommon("error"));
    }
  }

  /** Check whether all markets of an event have been settled (or canceled) */
  function allMarketsSettled(event: BetEvent): boolean {
    const markets = event.markets ?? [];
    if (markets.length === 0) return false;
    return markets.every(
      (m) => m.status === "SETTLED" || m.status === "CANCELED",
    );
  }

  const tabs: {
    key: AdminTab;
    label: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
  }[] = [
    {
      key: "events",
      label: tAdmin("events"),
      icon: <Trophy className="h-4 w-4" />,
    },
    {
      key: "users",
      label: tAdmin("users"),
      icon: <Users className="h-4 w-4" />,
      adminOnly: true,
    },
    {
      key: "settings",
      label: tAdmin("settings"),
      icon: <Settings className="h-4 w-4" />,
      adminOnly: true,
    },
    {
      key: "audit",
      label: tAdmin("auditLog"),
      icon: <ScrollText className="h-4 w-4" />,
      adminOnly: true,
    },
    {
      key: "odds",
      label: tAdmin("oddsLog"),
      icon: <TrendingUp className="h-4 w-4" />,
      adminOnly: true,
    },
  ];
  const visibleTabs = tabs.filter(
    (tab) => !tab.adminOnly || session?.user?.role === "ADMIN",
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">{tNav("admin")}</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={loadTabData}
          title={tAdmin("refresh")}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              const url = new URL(window.location.href);
              url.searchParams.set("tab", tab.key);
              window.history.replaceState(null, "", url.toString());
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════ EVENTS TAB ═══════════ */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {events.length} Events
            </p>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <Plus className="mr-1 h-4 w-4" /> {tAdmin("newBet")}
            </Button>
          </div>

          {/* Create form */}
          {showCreateForm && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle>{tAdmin("createNewBet")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category (Markt) selection */}
                {categories.length > 0 && (
                  <div>
                    <Label>{tAdmin("marketCategory")} *</Label>
                    <select
                      className="w-full rounded border bg-background px-3 py-2 text-sm mt-1"
                      value={newEvent.categoryId}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, categoryId: e.target.value })
                      }
                    >
                      <option value="">{tAdmin("selectMarket")}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Event details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>{tAdmin("betTitleDe")} *</Label>
                    <Input
                      value={newEvent.title}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, title: e.target.value })
                      }
                      placeholder={tAdmin("betTitleDePlaceholder")}
                    />
                  </div>
                  <div>
                    <Label>{tAdmin("betTitleEn")}</Label>
                    <Input
                      value={newEvent.titleEn}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, titleEn: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>{tAdmin("descriptionDe")}</Label>
                    <Input
                      value={newEvent.description}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>{tAdmin("descriptionEn")}</Label>
                    <Input
                      value={newEvent.descriptionEn}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          descriptionEn: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>{tAdmin("endTime")} *</Label>
                    <DateTimeInput
                      required
                      value={newEvent.endTime}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, endTime: e.target.value })
                      }
                    />
                  </div>
                </div>

                <Separator />

                {/* Wettoptionen with odds (= multiplier) */}
                <div className="space-y-2">
                  <Label>{tAdmin("outcomesAndOdds")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {tAdmin("oddsMultiplierHint")}
                  </p>
                  {newOutcomes.map((row, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        placeholder={
                          tAdmin("outcomePlaceholder", { number: i + 1 }) + " *"
                        }
                        value={row.name}
                        onChange={(e) => {
                          const copy = [...newOutcomes];
                          copy[i] = { ...copy[i], name: e.target.value };
                          setNewOutcomes(copy);
                        }}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          step="0.01"
                          placeholder={tAdmin("oddsLabel")}
                          value={row.odds}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== "" && parseFloat(val) > 100) return;
                            const copy = [...newOutcomes];
                            copy[i] = { ...copy[i], odds: val };
                            setNewOutcomes(copy);
                          }}
                          className="w-24"
                        />
                      </div>
                      {newOutcomes.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() =>
                            setNewOutcomes(
                              newOutcomes.filter((_, j) => j !== i),
                            )
                          }
                        >
                          <XCircle className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setNewOutcomes([
                        ...newOutcomes,
                        { name: "", odds: "2.00" },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" /> {tAdmin("addOutcome")}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateEvent}
                    disabled={
                      !newEvent.title ||
                      newOutcomes.some((o) => !o.name) ||
                      creatingEvent
                    }
                  >
                    {creatingEvent ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-1 h-4 w-4" />
                    )}
                    {tAdmin("createBet")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    {tCommon("cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event list */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : events.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">{tAdmin("noEvents")}</p>
            </Card>
          ) : (
            events.map((event) => (
              <Card
                key={event.id}
                className={
                  expandedEvent === event.id ? "border-primary/40" : ""
                }
              >
                <CardContent className="py-4">
                  {/* Event header row */}
                  <div
                    className="flex items-center justify-between gap-3 cursor-pointer"
                    onClick={() =>
                      setExpandedEvent(
                        expandedEvent === event.id ? null : event.id,
                      )
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {event.title}
                        </h3>
                        <Badge className={statusColors[event.status] || ""}>
                          {tEvents(`status.${event.status}`)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.category?.name || "—"}
                        {event.startTime &&
                          ` · ${tAdmin("start")}: ${new Date(event.startTime).toLocaleDateString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                        {event.endTime &&
                          ` · ${tAdmin("end")}: ${new Date(event.endTime).toLocaleDateString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status transitions */}
                      {STATUS_FLOW[event.status]?.length > 0 && (
                        <div className="hidden sm:flex gap-1">
                          {STATUS_FLOW[event.status].map((s) => {
                            const needsSettle =
                              s === "SETTLED" && !allMarketsSettled(event);
                            return (
                              <Button
                                key={s}
                                variant="outline"
                                size="sm"
                                className={`text-xs h-7 ${needsSettle ? "opacity-50" : ""}`}
                                disabled={needsSettle}
                                title={
                                  needsSettle
                                    ? tAdmin("settleMarketsFirst")
                                    : undefined
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(
                                    event.id,
                                    s as EventStatus,
                                  );
                                }}
                              >
                                <ArrowRight className="mr-1 h-3 w-3" />
                                {tEvents(`status.${s}`)}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                      {expandedEvent === event.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {/* Expanded: markets + add market + settle */}
                  {expandedEvent === event.id && (
                    <div className="mt-4 space-y-4">
                      <Separator />

                      {/* Mobile status transitions */}
                      {STATUS_FLOW[event.status]?.length > 0 && (
                        <div className="flex gap-1 flex-wrap sm:hidden">
                          {STATUS_FLOW[event.status].map((s) => {
                            const needsSettle =
                              s === "SETTLED" && !allMarketsSettled(event);
                            return (
                              <Button
                                key={s}
                                variant="outline"
                                size="sm"
                                className={`text-xs h-7 ${needsSettle ? "opacity-50" : ""}`}
                                disabled={needsSettle}
                                title={
                                  needsSettle
                                    ? tAdmin("settleMarketsFirst")
                                    : undefined
                                }
                                onClick={() =>
                                  handleStatusChange(event.id, s as EventStatus)
                                }
                              >
                                <ArrowRight className="mr-1 h-3 w-3" />
                                {tEvents(`status.${s}`)}
                              </Button>
                            );
                          })}
                        </div>
                      )}

                      {/* Existing markets */}
                      {event.markets && event.markets.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold">
                            {tAdmin("markets")}
                          </h4>
                          {event.markets.map((market: Market) => (
                            <div
                              key={market.id}
                              className="rounded-lg border p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {market.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {market.type}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {market.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {market.outcomes.map((outcome) => (
                                  <div
                                    key={outcome.id}
                                    className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                                  >
                                    <div>
                                      <span className="font-medium">
                                        {outcome.name}
                                      </span>
                                      <span className="ml-2 text-primary font-bold">
                                        {outcome.currentOdds.toFixed(2)}
                                      </span>
                                    </div>
                                    {/* Settle button */}
                                    {(market.status === "OPEN" ||
                                      market.status === "LOCKED") &&
                                      (event.status === "CLOSED" ||
                                        event.status === "OPEN") && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 text-xs text-green-400 hover:text-green-300"
                                          disabled={
                                            settlingMarket === market.id
                                          }
                                          onClick={() =>
                                            handleSettle(market.id, outcome.id)
                                          }
                                        >
                                          {settlingMarket === market.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                          )}
                                          {tAdmin("winner")}
                                        </Button>
                                      )}
                                    {outcome.resultStatus === "WON" && (
                                      <Badge className="bg-green-500/20 text-green-400 text-xs">
                                        WON
                                      </Badge>
                                    )}
                                    {outcome.resultStatus === "LOST" && (
                                      <Badge className="bg-red-500/20 text-red-400 text-xs">
                                        LOST
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add market form */}
                      {(event.status === "DRAFT" ||
                        event.status === "OPEN") && (
                        <div className="rounded-lg border border-dashed border-primary/30 p-4 space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-1">
                            <Plus className="h-3 w-3" /> {tAdmin("addMarket")}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                            <Input
                              placeholder={
                                tAdmin("marketNamePlaceholder") + " *"
                              }
                              value={marketForm.name}
                              onChange={(e) =>
                                setMarketForm({
                                  ...marketForm,
                                  name: e.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder={tAdmin("marketNameEnPlaceholder")}
                              value={marketForm.nameEn}
                              onChange={(e) =>
                                setMarketForm({
                                  ...marketForm,
                                  nameEn: e.target.value,
                                })
                              }
                            />
                            <select
                              className="rounded border bg-background px-2 py-1.5 text-sm"
                              value={marketForm.type}
                              onChange={(e) =>
                                setMarketForm({
                                  ...marketForm,
                                  type: e.target.value,
                                })
                              }
                            >
                              <option value="WINNER">WINNER</option>
                              <option value="OVER_UNDER">OVER/UNDER</option>
                              <option value="YES_NO">YES/NO</option>
                              <option value="CUSTOM">CUSTOM</option>
                            </select>
                            <Input
                              placeholder="Margin (0.95)"
                              value={marketForm.marginFactor}
                              onChange={(e) =>
                                setMarketForm({
                                  ...marketForm,
                                  marginFactor: e.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder="Virtual Pool (100)"
                              value={marketForm.virtualPool}
                              onChange={(e) =>
                                setMarketForm({
                                  ...marketForm,
                                  virtualPool: e.target.value,
                                })
                              }
                              title="Higher = more stable odds"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">
                              {tAdmin("outcomesLabel")}
                            </Label>
                            {outcomeRows.map((row, i) => (
                              <div key={i} className="flex gap-2 items-center">
                                <Input
                                  placeholder={
                                    tAdmin("outcomeItemPlaceholder", {
                                      number: i + 1,
                                    }) + " *"
                                  }
                                  value={row.name}
                                  onChange={(e) => {
                                    const copy = [...outcomeRows];
                                    copy[i] = {
                                      ...copy[i],
                                      name: e.target.value,
                                    };
                                    setOutcomeRows(copy);
                                  }}
                                  className="flex-1"
                                />
                                <Input
                                  placeholder="Odds"
                                  value={row.initialOdds}
                                  onChange={(e) => {
                                    const copy = [...outcomeRows];
                                    copy[i] = {
                                      ...copy[i],
                                      initialOdds: e.target.value,
                                    };
                                    setOutcomeRows(copy);
                                  }}
                                  className="w-24"
                                />
                                {outcomeRows.length > 2 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() =>
                                      setOutcomeRows(
                                        outcomeRows.filter((_, j) => j !== i),
                                      )
                                    }
                                  >
                                    <XCircle className="h-4 w-4 text-red-400" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setOutcomeRows([
                                  ...outcomeRows,
                                  { name: "", initialOdds: "2.00" },
                                ])
                              }
                            >
                              <Plus className="mr-1 h-3 w-3" />{" "}
                              {tAdmin("addOutcomeShort")}
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddMarket(event.id)}
                            disabled={addingMarket}
                          >
                            {addingMarket ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="mr-1 h-4 w-4" />
                            )}
                            {tAdmin("saveMarket")}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ═══════════ USERS TAB ═══════════ */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />{" "}
                {tAdmin("usersCount", { count: users.length })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-muted rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${!user.isActive ? "opacity-60 border-dashed" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            handleToggleActive(user.id, !user.isActive)
                          }
                          title={
                            user.isActive
                              ? tAdmin("deactivate")
                              : tAdmin("activate")
                          }
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                            user.isActive
                              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                              : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          }`}
                        >
                          {user.isActive ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </button>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() =>
                            setTokenDialog({
                              userId: user.id,
                              username: user.username,
                            })
                          }
                        >
                          <Coins className="h-3 w-3 text-primary" />
                          {Number(user.tokenBalance ?? 0).toFixed(0)}
                          <Pencil className="h-3 w-3 ml-0.5" />
                        </Button>
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleUpdateRole(user.id, e.target.value)
                          }
                          className="rounded border bg-background px-2 py-1 text-sm"
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Token adjustment dialog */}
          {tokenDialog && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={() => setTokenDialog(null)}
            >
              <Card
                className="w-full max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    {tAdmin("tokensAdjustTitle", {
                      username: tokenDialog.username,
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>{tAdmin("tokensAmountLabel")}</Label>
                    <Input
                      type="number"
                      placeholder={tAdmin("tokensAmountPlaceholder")}
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label>{tAdmin("reasonLabel")}</Label>
                    <Input
                      placeholder={tAdmin("reasonPlaceholder")}
                      value={tokenReason}
                      onChange={(e) => setTokenReason(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setTokenDialog(null)}
                    >
                      {tCommon("cancel")}
                    </Button>
                    <Button
                      onClick={handleAdjustTokens}
                      disabled={!tokenAmount}
                    >
                      <Coins className="mr-1 h-4 w-4" /> {tAdmin("adjust")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ SETTINGS TAB ═══════════ */}
      {activeTab === "settings" && (
        <div className="space-y-4">
          {/* Pending Profile Changes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" /> {tAdmin("pendingProfileChanges")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : pendingChanges.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tAdmin("noPendingChanges")}</p>
              ) : (
                <div className="space-y-4">
                  {pendingChanges.map((change) => {
                    const changes = change.changes as Record<string, unknown>;
                    const currentUser = change.user;
                    return (
                      <div
                        key={change.id}
                        className="rounded-lg border border-border p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">
                              {tAdmin("requestedBy")}: {currentUser?.username ?? "?"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {currentUser?.email} &middot; {new Date(change.createdAt).toLocaleString(locale)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleProfileChangeReview(change.id, "approve")}
                              className="gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {tAdmin("approve")}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleProfileChangeReview(change.id, "reject")}
                              className="gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {tAdmin("reject")}
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-2 text-sm">
                          {Object.entries(changes).map(([key, newVal]) => {
                            const currentVal = currentUser ? (currentUser as Record<string, unknown>)[key] : undefined;
                            return (
                              <div key={key} className="grid grid-cols-3 gap-2 items-center rounded bg-secondary/50 px-3 py-2">
                                <span className="font-medium">{key}</span>
                                <span className="text-muted-foreground truncate" title={String(currentVal ?? "—")}>
                                  {tAdmin("currentValue")}: {String(currentVal ?? "—")}
                                </span>
                                <span className="text-primary truncate" title={String(newVal ?? "—")}>
                                  {tAdmin("newValue")}: {String(newVal ?? "—")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" /> {tAdmin("systemSettings")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 bg-muted rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {settings.map((setting) => (
                    <div key={setting.key} className="space-y-1">
                      <label className="text-sm font-medium">{setting.key}</label>
                      {setting.description && (
                        <p className="text-xs text-muted-foreground">
                          {setting.description}
                        </p>
                      )}
                      <Input
                        defaultValue={setting.value}
                        onBlur={(e) => {
                          if (e.target.value !== setting.value)
                            handleUpdateSetting(setting.key, e.target.value);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════ AUDIT TAB ═══════════ */}
      {activeTab === "audit" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" /> {tAdmin("auditLog")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-1 border-b border-border">
              <button
                onClick={() => setAuditSubTab("activity")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${auditSubTab === "activity" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {tAdmin("auditActivity")}
              </button>
              <button
                onClick={() => setAuditSubTab("categories")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${auditSubTab === "categories" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {tAdmin("auditMarkets")}
              </button>
            </div>

            {/* ── Activity sub-tab ── */}
            {auditSubTab === "activity" && (
              <>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: null, label: tCommon("all"), Icon: List },
                    { key: "USER_REGISTERED,USER_LOGIN", label: tAdmin("auditAuth"), Icon: UserPlus },
                    { key: "PLACE_BET", label: tAdmin("auditBets"), Icon: Target },
                    { key: "CREATE_EVENT,CHANGE_EVENT_STATUS,AUTO_CLOSE_EVENT", label: tAdmin("auditEvents"), Icon: Calendar },
                    { key: "ADJUST_TOKENS", label: tAdmin("auditTokens"), Icon: Coins },
                    { key: "CHANGE_ROLE,ACTIVATE_USER,DEACTIVATE_USER,UPDATE_PROFILE", label: tAdmin("auditUsers"), Icon: Users },
                    { key: "UPDATE_SETTING", label: tAdmin("auditSettings"), Icon: Settings },
                  ].map((f) => (
                    <Button
                      key={f.key ?? "all"}
                      variant={auditFilter === f.key ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => { setAuditFilter(f.key); setAuditCategory(null); }}
                    >
                      <f.Icon className={`mr-1 h-3 w-3 ${auditFilter === f.key ? "text-primary-foreground" : "text-primary"}`} /> {f.label}
                    </Button>
                  ))}
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <svg className="animate-spin" style={{ animationDuration: "4s" }} width="56" height="56" viewBox="-26 -26 52 52" fill="none">
                      <circle cx="0" cy="0" r="22" fill="#5B3D7A" />
                      {Array.from({ length: 8 }).map((_, i) => (
                        <rect key={i} x="-3" y="-22" width="6" height="8" rx="1.5" fill="#E84D8A" transform={`rotate(${i * 45} 0 0)`} />
                      ))}
                      <circle cx="0" cy="0" r="15" fill="#6B4D8A" />
                      {Array.from({ length: 8 }).map((_, i) => (
                        <circle key={i} cx="0" cy="-12" r="2" fill="#C8D94A" transform={`rotate(${i * 45} 0 0)`} />
                      ))}
                      <circle cx="0" cy="0" r="8" fill="#D4E157" />
                    </svg>
                    <p className="text-sm text-muted-foreground">{tAdmin("loadingData")}</p>
                  </div>
                ) : auditLog.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{tAdmin("noEntries")}</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{tAdmin("auditDate")}</th>
                          <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{tAdmin("auditUser")}</th>
                          <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{tAdmin("auditAction")}</th>
                          <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{tAdmin("auditEntity")}</th>
                          <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{tAdmin("auditDetails")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLog.map((entry) => {
                          const det = entry.details as Record<string, unknown> | null;
                          const tokenAmount =
                            det &&
                            (entry.action === "PLACE_BET"
                              ? -(det.stake as number)
                              : entry.action === "ADJUST_TOKENS"
                                ? (det.amount as number)
                                : null);

                          function formatDetails() {
                            if (!det) return null;
                            switch (entry.action) {
                              case "CREATE_EVENT":
                                return `${det.title}${det.categoryName ? ` [${det.categoryName}]` : ""}`;
                              case "CHANGE_EVENT_STATUS":
                                return `${det.title} — ${det.from} → ${det.to}${det.categoryName ? ` [${det.categoryName}]` : ""}`;
                              case "CREATE_MARKET":
                                return `${det.name} (${det.outcomeCount} Optionen)`;
                              case "SETTLE_MARKET":
                                return null;
                              case "PLACE_BET":
                                return `${det.outcomeName} · Quote ${det.odds}`;
                              case "ADJUST_TOKENS":
                                return (det.reason as string) || null;
                              case "CHANGE_ROLE":
                                return `→ ${det.newRole}`;
                              case "ACTIVATE_USER":
                              case "DEACTIVATE_USER":
                                return null;
                              case "USER_REGISTERED":
                                return `${det.username} (${det.email})`;
                              case "USER_LOGIN":
                                return det.username as string;
                              case "UPDATE_PROFILE":
                                return Object.keys(det).join(", ");
                              case "UPDATE_SETTING":
                                return `${det.key} = ${det.value}`;
                              case "AUTO_CLOSE_EVENT":
                                return `${det.title} — automatisch geschlossen`;
                              case "AUTO_ADJUST_ODDS":
                                return `${det.marketName} — ${det.outcomesUpdated} Optionen (${det.changePct}%)`;
                              default:
                                return Object.entries(det).map(([k, v]) => `${k}: ${v}`).join(" · ");
                            }
                          }

                          const detailText = formatDetails();

                          return (
                            <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(entry.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="px-4 py-3 font-medium whitespace-nowrap">{entry.admin?.username || "System"}</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="text-xs">{entry.action.replace(/_/g, " ")}</Badge>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{entry.entityType || "—"}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  {tokenAmount != null && (
                                    <span className={`font-bold ${tokenAmount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                      {tokenAmount >= 0 ? "+" : ""}{tokenAmount} T
                                    </span>
                                  )}
                                  {detailText && <span className="truncate max-w-xs">{detailText}</span>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ── Categories sub-tab ── */}
            {auditSubTab === "categories" && (
              <>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <svg className="animate-spin" style={{ animationDuration: "4s" }} width="56" height="56" viewBox="-26 -26 52 52" fill="none">
                      <circle cx="0" cy="0" r="22" fill="#5B3D7A" />
                      {Array.from({ length: 8 }).map((_, i) => (
                        <rect key={i} x="-3" y="-22" width="6" height="8" rx="1.5" fill="#E84D8A" transform={`rotate(${i * 45} 0 0)`} />
                      ))}
                      <circle cx="0" cy="0" r="15" fill="#6B4D8A" />
                      {Array.from({ length: 8 }).map((_, i) => (
                        <circle key={i} cx="0" cy="-12" r="2" fill="#C8D94A" transform={`rotate(${i * 45} 0 0)`} />
                      ))}
                      <circle cx="0" cy="0" r="8" fill="#D4E157" />
                    </svg>
                    <p className="text-sm text-muted-foreground">{tAdmin("loadingData")}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {categories.map((cat) => {
                      const entries = categoryAuditLogs[cat.name] || [];
                      return (
                        <div key={cat.id}>
                          <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            {cat.name}
                            <span className="text-xs text-muted-foreground font-normal">({entries.length} {tAdmin("auditActivity")})</span>
                          </h3>
                          {entries.length === 0 ? (
                            <p className="text-xs text-muted-foreground pl-4">{tAdmin("noEntries")}</p>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-border">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border bg-muted/50">
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">{tAdmin("auditDate")}</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">{tAdmin("auditUser")}</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">{tAdmin("oddsEvent")}</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">{tAdmin("auditAction")}</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">{tAdmin("auditDetails")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entries.map((entry) => {
                                    const det = entry.details as Record<string, unknown> | null;
                                    const title = entry.eventTitle || (det?.title as string) || "—";
                                    const detail = entry.action === "CREATE_EVENT"
                                      ? "Erstellt"
                                      : entry.action === "CHANGE_EVENT_STATUS" && det
                                        ? `${det.from} → ${det.to}`
                                        : entry.action.replace(/_/g, " ");
                                    return (
                                      <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                                          {new Date(entry.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </td>
                                        <td className="px-4 py-2 text-xs font-medium">{entry.admin?.username || "System"}</td>
                                        <td className="px-4 py-2 text-xs font-semibold">{title}</td>
                                        <td className="px-4 py-2">
                                          <Badge variant="outline" className="text-xs">{entry.action.replace(/_/g, " ")}</Badge>
                                        </td>
                                        <td className="px-4 py-2 text-xs text-muted-foreground">{detail}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════ ODDS LOG TAB ═══════════ */}
      {activeTab === "odds" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> {tAdmin("oddsLog")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Event filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!oddsEventFilter ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setOddsEventFilter(null)}
              >
                {tCommon("all")}
              </Button>
              {events.filter((e) => e.status === "OPEN" || e.status === "CLOSED" || e.status === "SETTLED").map((event) => (
                <Button
                  key={event.id}
                  variant={oddsEventFilter === event.id ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 max-w-48 truncate"
                  onClick={() => setOddsEventFilter(oddsEventFilter === event.id ? null : event.id)}
                >
                  {event.title}
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <svg
                  className="animate-spin"
                  style={{ animationDuration: "4s" }}
                  width="56"
                  height="56"
                  viewBox="-26 -26 52 52"
                  fill="none"
                >
                  <circle cx="0" cy="0" r="22" fill="#5B3D7A" />
                  {Array.from({ length: 8 }).map((_, i) => (
                    <rect key={i} x="-3" y="-22" width="6" height="8" rx="1.5" fill="#E84D8A" transform={`rotate(${i * 45} 0 0)`} />
                  ))}
                  <circle cx="0" cy="0" r="15" fill="#6B4D8A" />
                  {Array.from({ length: 8 }).map((_, i) => (
                    <circle key={i} cx="0" cy="-12" r="2" fill="#C8D94A" transform={`rotate(${i * 45} 0 0)`} />
                  ))}
                  <circle cx="0" cy="0" r="8" fill="#D4E157" />
                </svg>
                <p className="text-sm text-muted-foreground">{tAdmin("loadingData")}</p>
              </div>
            ) : oddsLog.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {tAdmin("noEntries")}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{tAdmin("auditDate")}</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{tAdmin("oddsEvent")}</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{tAdmin("oddsOption")}</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">{tAdmin("oddsOld")}</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">{tAdmin("oddsNew")}</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">{tAdmin("oddsChange")}</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{tAdmin("oddsTrigger")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oddsLog.map((entry) => {
                      const oldVal = Number(entry.oldOdds);
                      const newVal = Number(entry.newOdds);
                      const diff = newVal - oldVal;
                      const pct = oldVal > 0 ? ((diff / oldVal) * 100).toFixed(1) : "0";
                      return (
                        <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(entry.changedAt).toLocaleDateString(locale, {
                              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3 font-medium max-w-48 truncate">
                            {entry.eventTitle}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {entry.outcomeName}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {oldVal.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold">
                            {newVal.toFixed(2)}
                          </td>
                          <td className={`px-4 py-3 text-right tabular-nums font-bold ${diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(2)} ({pct}%)
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs">
                              {entry.triggerType.replace(/_/g, " ")}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
