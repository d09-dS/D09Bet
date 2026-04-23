"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { BetEvent, Category, PageResponse } from "@/types";
import { Button } from "@/components/ui/button";
// Card components no longer needed — using custom styled divs
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Trophy, ChevronRight, Filter, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useFavoritesStore } from "@/stores/favoritesStore";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  OPEN: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  CLOSED: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  SETTLED: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  CANCELED: "bg-red-500/15 text-red-400 border-red-500/20",
};

export default function EventsPage() {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { ids: favoriteIds, toggleFavorite, isFavorite } = useFavoritesStore();
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [events, setEvents] = useState<BetEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>("OPEN");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [search, selectedCategory, selectedStatus, page]);

  async function loadCategories() {
    try {
      const data = await api.get<Category[]>("/events/categories");
      setCategories(data);
    } catch {
      // ignore
    }
  }

  async function loadEvents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus) params.set("status", selectedStatus);
      if (selectedCategory) params.set("categoryId", String(selectedCategory));
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("size", "12");

      const data = await api.get<PageResponse<BetEvent>>(`/events?${params}`);
      setEvents(data.content);
      setTotalPages(data.totalPages);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-1">{t("market")}</p>
          <h1 className="text-3xl font-extrabold md:text-4xl">{t("title")}</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tCommon("search") + "..."}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className={`mr-1 h-3 w-3 ${showFavoritesOnly ? "fill-current" : ""}`} />
            {favoriteIds.length}
          </Button>
          <Button
            variant={selectedStatus === null && !showFavoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => { setSelectedStatus(null); setShowFavoritesOnly(false); setPage(0); }}
          >
            {tCommon("all")}
          </Button>
          {["OPEN", "CLOSED", "SETTLED"].map((s) => (
            <Button
              key={s}
              variant={selectedStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => { setSelectedStatus(s); setPage(0); }}
            >
              {t(`status.${s}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            size="sm"
            onClick={() => { setSelectedCategory(null); setPage(0); }}
          >
            <Filter className="mr-1 h-3 w-3" /> {tCommon("all")}
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => { setSelectedCategory(cat.id); setPage(0); }}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      )}

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/50 bg-card/80 overflow-hidden">
              <div className="h-[2px] bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />
              <div className="p-6 space-y-3">
                <div className="h-5 bg-secondary rounded-lg w-3/4 animate-shimmer" />
                <div className="h-4 bg-secondary rounded-lg w-1/2 animate-shimmer" />
                <div className="h-4 bg-secondary rounded-lg w-1/3 animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card/50 p-16 text-center">
          <Trophy className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-lg">{t("noEvents")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(showFavoritesOnly ? events.filter((e) => isFavorite(e.id)) : events).map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              onClick={() => router.push(`/events/${event.id}`)}
              className="group cursor-pointer rounded-lg border border-border bg-card overflow-hidden card-hover"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">{event.title}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(event.id); }}
                      className="p-1 hover:bg-secondary rounded"
                      aria-label={isFavorite(event.id) ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star className={`h-3.5 w-3.5 ${isFavorite(event.id) ? "fill-primary text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"}`} />
                    </button>
                    <Badge className={statusColors[event.status] || ""}>
                      {event.status === "OPEN" && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      {t(`status.${event.status}`)}
                    </Badge>
                  </div>
                </div>
                {event.category && (
                  <span className="text-xs text-muted-foreground">{event.category.name}</span>
                )}
                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {event.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
                  <div className="flex flex-col gap-1">
                    {event.startTime && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(event.startTime).toLocaleDateString(locale, {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                    )}
                    {event.endTime && (
                      <span className="flex items-center gap-1.5 text-muted-foreground/70">
                        <Calendar className="h-3.5 w-3.5" />
                        {t("endTime")}: {new Date(event.endTime).toLocaleDateString(locale, {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            {tCommon("back")}
          </Button>
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            {tCommon("next")}
          </Button>
        </div>
      )}
    </div>
  );
}
