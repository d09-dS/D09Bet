"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { BetEvent, User, PageResponse, EventStatus, Market, Category } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Shield, Users, Settings, ScrollText, Coins, Plus, Pencil, Trophy,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, ArrowRight, Loader2, RefreshCw,
} from "lucide-react";

type AdminTab = "events" | "users" | "settings" | "audit";

interface AuditEntry {
  id: string;
  admin: { username: string };
  action: string;
  entityType: string;
  entityId: string;
  details: unknown;
  createdAt: string;
}

interface SystemSetting {
  key: string;
  value: string;
  description: string;
}

const STATUS_FLOW: Record<string, string[]> = {
  DRAFT: ["SCHEDULED", "OPEN", "CANCELED"],
  SCHEDULED: ["OPEN", "CANCELED"],
  OPEN: ["CLOSED", "CANCELED"],
  CLOSED: ["SETTLED", "CANCELED"],
  SETTLED: [],
  CANCELED: [],
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/20 text-gray-400",
  SCHEDULED: "bg-blue-500/20 text-blue-400",
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
  const locale = useLocale();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>("events");
  const [events, setEvents] = useState<BetEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Event CRUD
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", titleEn: "", description: "", descriptionEn: "", startTime: "", endTime: "", categoryId: "" });
  const [newOutcomes, setNewOutcomes] = useState([{ name: "", odds: "2.00" }, { name: "", odds: "2.00" }]);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Market form
  const [marketForm, setMarketForm] = useState({ name: "", nameEn: "", type: "WINNER", marginFactor: "0.95", virtualPool: "100" });
  const [outcomeRows, setOutcomeRows] = useState([{ name: "", initialOdds: "2.00" }, { name: "", initialOdds: "2.00" }]);
  const [addingMarket, setAddingMarket] = useState(false);

  // Settlement
  const [settlingMarket, setSettlingMarket] = useState<string | null>(null);

  // Token adjust
  const [tokenDialog, setTokenDialog] = useState<{ userId: string; username: string } | null>(null);
  const [tokenAmount, setTokenAmount] = useState("");
  const [tokenReason, setTokenReason] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.accessToken) { router.push("/login"); return; }
    if (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR") { router.push("/"); return; }
    // Load categories for event creation form
    api.get<Category[]>("/events/categories").then(setCategories).catch(() => {});
  }, [session, status, router]);

  const loadTabData = useCallback(async () => {
    if (!session?.user?.accessToken) return;
    const token = session.user.accessToken;
    setLoading(true);
    try {
      if (activeTab === "events") {
        const data = await api.get<PageResponse<BetEvent>>("/events?size=50&include=markets", token);
        setEvents(data.content);
      } else if (activeTab === "users" && session.user.role === "ADMIN") {
        const data = await api.get<PageResponse<User>>("/admin/users?size=50", token);
        setUsers(data.content);
      } else if (activeTab === "settings" && session.user.role === "ADMIN") {
        const data = await api.get<SystemSetting[]>("/admin/settings", token);
        setSettings(data);
      } else if (activeTab === "audit" && session.user.role === "ADMIN") {
        const data = await api.get<PageResponse<AuditEntry>>("/admin/audit-log?size=50", token);
        setAuditLog(data.content);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [activeTab, session]);

  useEffect(() => { loadTabData(); }, [loadTabData]);

  const tok = session?.user?.accessToken || "";

  // ── Event CRUD ──
  async function handleCreateEvent() {
    if (!tok || !newEvent.title) return;
    if (newOutcomes.some(o => !o.name)) { toast.error(tAdmin("fillAllOutcomes")); return; }
    setCreatingEvent(true);
    try {
      if (newEvent.startTime && newEvent.endTime && new Date(newEvent.endTime) <= new Date(newEvent.startTime)) {
        toast.error(tAdmin("endAfterStart"));
        setCreatingEvent(false);
        return;
      }
      // 1. Create event with category
      const created = await api.post<BetEvent>("/events", {
        title: newEvent.title,
        titleEn: newEvent.titleEn || undefined,
        description: newEvent.description || undefined,
        descriptionEn: newEvent.descriptionEn || undefined,
        categoryId: newEvent.categoryId ? Number(newEvent.categoryId) : undefined,
        startTime: newEvent.startTime ? new Date(newEvent.startTime).toISOString() : undefined,
        endTime: newEvent.endTime ? new Date(newEvent.endTime).toISOString() : undefined,
      }, tok);
      // 2. Automatically create a market with the outcomes
      if (newOutcomes.length >= 2 && newOutcomes.every(o => o.name)) {
        await api.post(`/events/${created.id}/markets`, {
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
        }, tok);
      }
      toast.success(tAdmin("eventCreated"));
      setNewEvent({ title: "", titleEn: "", description: "", descriptionEn: "", startTime: "", endTime: "", categoryId: "" });
      setNewOutcomes([{ name: "", odds: "2.00" }, { name: "", odds: "2.00" }]);
      setShowCreateForm(false);
      loadTabData();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : tCommon("error")); }
    finally { setCreatingEvent(false); }
  }

  async function handleStatusChange(eventId: string, newStatus: EventStatus) {
    try {
      await api.patch(`/events/${eventId}/status`, { status: newStatus }, tok);
      toast.success(`Status → ${newStatus}`);
      loadTabData();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : tCommon("error")); }
  }

  async function handleAddMarket(eventId: string) {
    if (!marketForm.name || outcomeRows.some(o => !o.name)) { toast.error(tAdmin("fillAllFields")); return; }
    setAddingMarket(true);
    try {
      await api.post(`/events/${eventId}/markets`, {
        name: marketForm.name,
        nameEn: marketForm.nameEn || undefined,
        type: marketForm.type,
        marginFactor: parseFloat(marketForm.marginFactor),
        virtualPool: parseFloat(marketForm.virtualPool) || 100,
        outcomes: outcomeRows.map((o, i) => ({ name: o.name, initialOdds: parseFloat(o.initialOdds), sortOrder: i })),
      }, tok);
      toast.success(tAdmin("marketAdded"));
      setMarketForm({ name: "", nameEn: "", type: "WINNER", marginFactor: "0.95", virtualPool: "100" });
      setOutcomeRows([{ name: "", initialOdds: "2.00" }, { name: "", initialOdds: "2.00" }]);
      loadTabData();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : tCommon("error")); }
    finally { setAddingMarket(false); }
  }

  async function handleSettle(marketId: string, winningOutcomeId: string) {
    setSettlingMarket(marketId);
    try {
      await api.post(`/admin/markets/${marketId}/settle`, { winningOutcomeId }, tok);
      toast.success(tAdmin("marketSettled"));
      loadTabData();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : tCommon("error")); }
    finally { setSettlingMarket(null); }
  }

  // ── User management ──
  async function handleToggleActive(userId: string, isActive: boolean) {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive }, tok);
      toast.success(isActive ? tAdmin("userActivated") : tAdmin("userDeactivated"));
      loadTabData();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : tCommon("error")); }
  }

  async function handleUpdateRole(userId: string, role: string) {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role }, tok);
      toast.success(tAdmin("roleChanged"));
      loadTabData();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : tCommon("error")); }
  }

  async function handleAdjustTokens() {
    if (!tokenDialog || !tokenAmount) return;
    try {
      await api.patch(`/admin/users/${tokenDialog.userId}/tokens`, {
        amount: parseFloat(tokenAmount),
        reason: tokenReason || tAdmin("adminAdjustment"),
      }, tok);
      toast.success(tAdmin("tokensAdjusted", { username: tokenDialog.username }));
      setTokenDialog(null); setTokenAmount(""); setTokenReason("");
      loadTabData();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : tCommon("error")); }
  }

  // ── Settings ──
  async function handleUpdateSetting(key: string, value: string) {
    try {
      await api.put(`/admin/settings/${key}`, { value }, tok);
      toast.success(tAdmin("settingSaved"));
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : tCommon("error")); }
  }

  /** Check whether all markets of an event have been settled (or canceled) */
  function allMarketsSettled(event: BetEvent): boolean {
    const markets = event.markets ?? [];
    if (markets.length === 0) return false;
    return markets.every((m) => m.status === "SETTLED" || m.status === "CANCELED");
  }

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: "events", label: tAdmin("events"), icon: <Trophy className="h-4 w-4" /> },
    { key: "users", label: tAdmin("users"), icon: <Users className="h-4 w-4" />, adminOnly: true },
    { key: "settings", label: tAdmin("settings"), icon: <Settings className="h-4 w-4" />, adminOnly: true },
    { key: "audit", label: tAdmin("auditLog"), icon: <ScrollText className="h-4 w-4" />, adminOnly: true },
  ];
  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || session?.user?.role === "ADMIN");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">{tNav("admin")}</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={loadTabData} title={tAdmin("refresh")}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>{tab.icon} {tab.label}</button>
        ))}
      </div>

      {/* ═══════════ EVENTS TAB ═══════════ */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{events.length} Events</p>
            <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="mr-1 h-4 w-4" /> {tAdmin("newBet")}
            </Button>
          </div>

          {/* Create form */}
          {showCreateForm && (
            <Card className="border-primary/30">
              <CardHeader><CardTitle>{tAdmin("createNewBet")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Category (Markt) selection */}
                {categories.length > 0 && (
                  <div>
                    <Label>{tAdmin("marketCategory")} *</Label>
                    <select
                      className="w-full rounded border bg-background px-3 py-2 text-sm mt-1"
                      value={newEvent.categoryId}
                      onChange={e => setNewEvent({...newEvent, categoryId: e.target.value})}
                    >
                      <option value="">{tAdmin("selectMarket")}</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Event details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>{tAdmin("betTitleDe")} *</Label><Input value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder={tAdmin("betTitleDePlaceholder")} /></div>
                  <div><Label>{tAdmin("betTitleEn")}</Label><Input value={newEvent.titleEn} onChange={e => setNewEvent({...newEvent, titleEn: e.target.value})} /></div>
                  <div><Label>{tAdmin("descriptionDe")}</Label><Input value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} /></div>
                  <div><Label>{tAdmin("descriptionEn")}</Label><Input value={newEvent.descriptionEn} onChange={e => setNewEvent({...newEvent, descriptionEn: e.target.value})} /></div>
                  <div><Label>{tAdmin("startTime")}</Label><Input type="datetime-local" value={newEvent.startTime} onChange={e => setNewEvent({...newEvent, startTime: e.target.value})} /></div>
                  <div><Label>{tAdmin("endTime")}</Label><Input type="datetime-local" value={newEvent.endTime} onChange={e => setNewEvent({...newEvent, endTime: e.target.value})} /></div>
                </div>

                <Separator />

                {/* Wettoptionen with odds (= multiplier) */}
                <div className="space-y-2">
                  <Label>{tAdmin("outcomesAndOdds")}</Label>
                  <p className="text-xs text-muted-foreground">{tAdmin("oddsMultiplierHint")}</p>
                  {newOutcomes.map((row, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        placeholder={tAdmin("outcomePlaceholder", { number: i + 1 }) + " *"}
                        value={row.name}
                        onChange={e => {
                          const copy = [...newOutcomes]; copy[i] = {...copy[i], name: e.target.value}; setNewOutcomes(copy);
                        }}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <Input
                          placeholder={tAdmin("oddsLabel")}
                          value={row.odds}
                          onChange={e => {
                            const copy = [...newOutcomes]; copy[i] = {...copy[i], odds: e.target.value}; setNewOutcomes(copy);
                          }}
                          className="w-24"
                        />
                        <span className="text-xs text-muted-foreground">x</span>
                      </div>
                      {newOutcomes.length > 2 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setNewOutcomes(newOutcomes.filter((_,j) => j!==i))}>
                          <XCircle className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => setNewOutcomes([...newOutcomes, { name: "", odds: "2.00" }])}>
                    <Plus className="mr-1 h-3 w-3" /> {tAdmin("addOutcome")}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateEvent} disabled={!newEvent.title || newOutcomes.some(o => !o.name) || creatingEvent}>
                    {creatingEvent ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                    {tAdmin("createBet")}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>{tCommon("cancel")}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event list */}
          {loading ? (
            <div className="space-y-3">{Array.from({length:4}).map((_,i)=><div key={i} className="h-20 bg-muted rounded-lg animate-pulse"/>)}</div>
          ) : events.length === 0 ? (
            <Card className="p-8 text-center"><p className="text-muted-foreground">{tAdmin("noEvents")}</p></Card>
          ) : (
            events.map((event) => (
              <Card key={event.id} className={expandedEvent === event.id ? "border-primary/40" : ""}>
                <CardContent className="py-4">
                  {/* Event header row */}
                  <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{event.title}</h3>
                        <Badge className={statusColors[event.status] || ""}>{tEvents(`status.${event.status}`)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.category?.name || "—"} · {event.markets?.length || 0} {tAdmin("marketsCount")}
                        {event.startTime && ` · ${tAdmin("start")}: ${new Date(event.startTime).toLocaleDateString(locale, { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}`}
                        {event.endTime && ` · ${tAdmin("end")}: ${new Date(event.endTime).toLocaleDateString(locale, { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status transitions */}
                      {STATUS_FLOW[event.status]?.length > 0 && (
                        <div className="hidden sm:flex gap-1">
                          {STATUS_FLOW[event.status].map(s => {
                            const needsSettle = s === "SETTLED" && !allMarketsSettled(event);
                            return (
                              <Button key={s} variant="outline" size="sm"
                                className={`text-xs h-7 ${needsSettle ? "opacity-50" : ""}`}
                                disabled={needsSettle}
                                title={needsSettle ? tAdmin("settleMarketsFirst") : undefined}
                                onClick={e => { e.stopPropagation(); handleStatusChange(event.id, s as EventStatus); }}>
                                <ArrowRight className="mr-1 h-3 w-3" />{s}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                      {expandedEvent === event.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {/* Expanded: markets + add market + settle */}
                  {expandedEvent === event.id && (
                    <div className="mt-4 space-y-4">
                      <Separator />

                      {/* Mobile status transitions */}
                      {STATUS_FLOW[event.status]?.length > 0 && (
                        <div className="flex gap-1 flex-wrap sm:hidden">
                          {STATUS_FLOW[event.status].map(s => {
                            const needsSettle = s === "SETTLED" && !allMarketsSettled(event);
                            return (
                              <Button key={s} variant="outline" size="sm"
                                className={`text-xs h-7 ${needsSettle ? "opacity-50" : ""}`}
                                disabled={needsSettle}
                                title={needsSettle ? tAdmin("settleMarketsFirst") : undefined}
                                onClick={() => handleStatusChange(event.id, s as EventStatus)}>
                                <ArrowRight className="mr-1 h-3 w-3" />{s}
                              </Button>
                            );
                          })}
                        </div>
                      )}

                      {/* Existing markets */}
                      {event.markets && event.markets.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold">{tAdmin("markets")}</h4>
                          {event.markets.map((market: Market) => (
                            <div key={market.id} className="rounded-lg border p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{market.name}</span>
                                  <Badge variant="outline" className="text-xs">{market.type}</Badge>
                                  <Badge variant="outline" className="text-xs">{market.status}</Badge>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {market.outcomes.map(outcome => (
                                  <div key={outcome.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                    <div>
                                      <span className="font-medium">{outcome.name}</span>
                                      <span className="ml-2 text-primary font-bold">{outcome.currentOdds.toFixed(2)}</span>
                                    </div>
                                    {/* Settle button */}
                                    {(market.status === "OPEN" || market.status === "LOCKED") && (event.status === "CLOSED" || event.status === "OPEN") && (
                                      <Button size="sm" variant="ghost" className="h-7 text-xs text-green-400 hover:text-green-300"
                                        disabled={settlingMarket === market.id}
                                        onClick={() => handleSettle(market.id, outcome.id)}>
                                        {settlingMarket === market.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                        {tAdmin("winner")}
                                      </Button>
                                    )}
                                    {outcome.resultStatus === "WON" && <Badge className="bg-green-500/20 text-green-400 text-xs">WON</Badge>}
                                    {outcome.resultStatus === "LOST" && <Badge className="bg-red-500/20 text-red-400 text-xs">LOST</Badge>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add market form */}
                      {(event.status === "DRAFT" || event.status === "SCHEDULED" || event.status === "OPEN") && (
                        <div className="rounded-lg border border-dashed border-primary/30 p-4 space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-1"><Plus className="h-3 w-3" /> {tAdmin("addMarket")}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                            <Input placeholder={tAdmin("marketNamePlaceholder") + " *"} value={marketForm.name} onChange={e => setMarketForm({...marketForm, name: e.target.value})} />
                            <Input placeholder={tAdmin("marketNameEnPlaceholder")} value={marketForm.nameEn} onChange={e => setMarketForm({...marketForm, nameEn: e.target.value})} />
                            <select className="rounded border bg-background px-2 py-1.5 text-sm" value={marketForm.type} onChange={e => setMarketForm({...marketForm, type: e.target.value})}>
                              <option value="WINNER">WINNER</option>
                              <option value="OVER_UNDER">OVER/UNDER</option>
                              <option value="YES_NO">YES/NO</option>
                              <option value="CUSTOM">CUSTOM</option>
                            </select>
                            <Input placeholder="Margin (0.95)" value={marketForm.marginFactor} onChange={e => setMarketForm({...marketForm, marginFactor: e.target.value})} />
                            <Input placeholder="Virtual Pool (100)" value={marketForm.virtualPool} onChange={e => setMarketForm({...marketForm, virtualPool: e.target.value})} title="Higher = more stable odds" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">{tAdmin("outcomesLabel")}</Label>
                            {outcomeRows.map((row, i) => (
                              <div key={i} className="flex gap-2 items-center">
                                <Input placeholder={tAdmin("outcomeItemPlaceholder", { number: i + 1 }) + " *"} value={row.name} onChange={e => {
                                  const copy = [...outcomeRows]; copy[i] = {...copy[i], name: e.target.value}; setOutcomeRows(copy);
                                }} className="flex-1" />
                                <Input placeholder="Odds" value={row.initialOdds} onChange={e => {
                                  const copy = [...outcomeRows]; copy[i] = {...copy[i], initialOdds: e.target.value}; setOutcomeRows(copy);
                                }} className="w-24" />
                                {outcomeRows.length > 2 && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setOutcomeRows(outcomeRows.filter((_,j) => j!==i))}>
                                    <XCircle className="h-4 w-4 text-red-400" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button variant="ghost" size="sm" onClick={() => setOutcomeRows([...outcomeRows, { name: "", initialOdds: "2.00" }])}>
                              <Plus className="mr-1 h-3 w-3" /> {tAdmin("addOutcomeShort")}
                            </Button>
                          </div>
                          <Button size="sm" onClick={() => handleAddMarket(event.id)} disabled={addingMarket}>
                            {addingMarket ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
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
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> {tAdmin("usersCount", { count: users.length })}</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 bg-muted rounded animate-pulse"/>)}</div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className={`flex items-center justify-between rounded-lg border p-3 ${!user.isActive ? "opacity-60 border-dashed" : ""}`}>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleActive(user.id, !user.isActive)}
                          title={user.isActive ? tAdmin("deactivate") : tAdmin("activate")}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                            user.isActive
                              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                              : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          }`}
                        >
                          {user.isActive ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </button>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setTokenDialog({ userId: user.id, username: user.username })}>
                          <Coins className="h-3 w-3 text-primary" />
                          {Number(user.tokenBalance ?? 0).toFixed(0)}
                          <Pencil className="h-3 w-3 ml-0.5" />
                        </Button>
                        <select value={user.role} onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                          className="rounded border bg-background px-2 py-1 text-sm">
                          <option value="USER">USER</option>
                          <option value="MODERATOR">MODERATOR</option>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setTokenDialog(null)}>
              <Card className="w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    {tAdmin("tokensAdjustTitle", { username: tokenDialog.username })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>{tAdmin("tokensAmountLabel")}</Label>
                    <Input type="number" placeholder={tAdmin("tokensAmountPlaceholder")} value={tokenAmount}
                      onChange={e => setTokenAmount(e.target.value)} autoFocus />
                  </div>
                  <div>
                    <Label>{tAdmin("reasonLabel")}</Label>
                    <Input placeholder={tAdmin("reasonPlaceholder")} value={tokenReason}
                      onChange={e => setTokenReason(e.target.value)} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setTokenDialog(null)}>{tCommon("cancel")}</Button>
                    <Button onClick={handleAdjustTokens} disabled={!tokenAmount}>
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
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> {tAdmin("systemSettings")}</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="h-16 bg-muted rounded animate-pulse"/>)}</div>
            ) : (
              <div className="space-y-4">
                {settings.map((setting) => (
                  <div key={setting.key} className="space-y-1">
                    <label className="text-sm font-medium">{setting.key}</label>
                    {setting.description && <p className="text-xs text-muted-foreground">{setting.description}</p>}
                    <Input defaultValue={setting.value} onBlur={(e) => {
                      if (e.target.value !== setting.value) handleUpdateSetting(setting.key, e.target.value);
                    }} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════ AUDIT TAB ═══════════ */}
      {activeTab === "audit" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" /> {tAdmin("auditLog")}</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 bg-muted rounded animate-pulse"/>)}</div>
            ) : auditLog.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{tAdmin("noEntries")}</p>
            ) : (
              <div className="space-y-2">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{entry.action}</Badge>
                        <span className="text-sm font-medium">{entry.entityType}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tAdmin("by")} {entry.admin?.username || "System"} · {new Date(entry.createdAt).toLocaleDateString(locale, { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
                      </p>
                    </div>
                    {entry.details != null && <p className="text-xs text-muted-foreground max-w-xs truncate">{typeof entry.details === "object" ? JSON.stringify(entry.details) : String(entry.details)}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
