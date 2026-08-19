"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Cpu,
  Server,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  Database,
  Layers,
  Search,
  Copy,
  Check,
  Eye,
  Globe2,
  ExternalLink,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import {
  syncLiveLandsatCatalogAction,
  getLiveSystemHealthAction,
  type LiveLandsatSyncResult,
  type LiveSystemMetrics,
  type LiveStacCollection,
} from "@/lib/admin-actions";
import { INITIAL_JOBS, INITIAL_USERS } from "@/lib/admin-data";

export default function AdminOverviewPage() {
  const [syncResult, setSyncResult] = useState<LiveLandsatSyncResult | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<LiveSystemMetrics | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [stacSearch, setStacSearch] = useState("");
  const [selectedStac, setSelectedStac] = useState<LiveStacCollection | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch of live USGS STAC catalog and health probes
    getLiveSystemHealthAction().then(setHealthMetrics).catch(console.error);
    syncLiveLandsatCatalogAction().then(setSyncResult).catch(console.error);
  }, []);

  const handleCopy = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getProductCategoryBadge = (id: string, title: string) => {
    const text = `${id} ${title}`.toLowerCase();
    if (text.includes("sr") || text.includes("surface reflectance")) {
      return { label: "Surface Reflectance", bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
    }
    if (text.includes("st") || text.includes("surface temperature")) {
      return { label: "Surface Temperature", bg: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
    }
    if (text.includes("bt") || text.includes("brightness temp")) {
      return { label: "Brightness Temp", bg: "bg-purple-500/10 text-purple-500 border-purple-500/20" };
    }
    if (text.includes("ard")) {
      return { label: "Analysis Ready (ARD)", bg: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" };
    }
    if (text.includes("c2l2") || text.includes("level-2")) {
      return { label: "Level-2 Product", bg: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
    }
    return { label: "Landsat Core", bg: "bg-muted text-muted-foreground border-border" };
  };

  const filteredCollections = useMemo(() => {
    if (!syncResult?.collections) return [];
    if (!stacSearch.trim()) return syncResult.collections;
    const q = stacSearch.toLowerCase();
    return syncResult.collections.filter(
      (c) => c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))
    );
  }, [syncResult?.collections, stacSearch]);

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncMessage("Querying live USGS Landsat STAC server (landsatlook.usgs.gov)...");
    try {
      const result = await syncLiveLandsatCatalogAction();
      setSyncResult(result);
      setSyncMessage(
        `Live USGS STAC Sync Complete: ${result.totalCollections} real Landsat products synced in ${result.syncDurationMs}ms.`
      );
      setTimeout(() => setSyncMessage(null), 6000);
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err?.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const stats = [
    { title: "Registered Users", value: INITIAL_USERS.length.toString(), change: "Active in database", icon: Users, color: "text-blue-500", href: "/admin/users" },
    { title: "Live Landsat Products", value: syncResult ? syncResult.totalCollections.toString() : "...", change: "From USGS STAC Server", icon: Layers, color: "text-emerald-500", href: "/admin/datasets" },
    { title: "Compute Jobs Running", value: INITIAL_JOBS.length.toString(), change: "Active queues", icon: Cpu, color: "text-amber-500", href: "/admin/jobs" },
    { title: "Live Server Uptime", value: healthMetrics ? `${Math.floor(healthMetrics.serverUptimeSeconds / 60)}m` : "...", change: healthMetrics?.nodeVersion ? `Node ${healthMetrics.nodeVersion}` : "Probing runtime...", icon: Server, color: "text-indigo-500", href: "/admin/health" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.title} href={s.href} className="block group">
              <Card className="border-border shadow-sm hover:border-primary/50 transition-all duration-200 h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                    {s.title}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">{s.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{s.change}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* USGS Landsat Live Catalog Widget */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-500" /> Live USGS Landsat STAC Catalog
            </CardTitle>
            <CardDescription className="text-xs">
              Direct connection to USGS Landsat Collection 2 & ARD Products API
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="gap-1.5 text-xs font-medium h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Querying USGS API..." : "Sync Live USGS Catalog"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {syncMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{syncMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-[11px] text-muted-foreground font-medium">STAC Connection</span>
              <p className="text-sm font-bold text-emerald-500 mt-0.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {syncResult ? "Connected (Live)" : "Connecting..."}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-[11px] text-muted-foreground font-medium">Live Products Tracked</span>
              <p className="text-sm font-bold text-foreground mt-0.5 font-mono">
                {syncResult ? `${syncResult.totalCollections} USGS Products` : "Querying..."}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-[11px] text-muted-foreground font-medium">STAC Query Latency</span>
              <p className="text-sm font-bold text-foreground mt-0.5 font-mono">
                {syncResult ? `${syncResult.syncDurationMs} ms` : "..."}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-[11px] text-muted-foreground font-medium">USGS API Endpoint</span>
              <p className="text-xs font-bold text-primary mt-1 truncate font-mono">
                landsatlook.usgs.gov
              </p>
            </div>
          </div>

          {/* Live Collections Table */}
          {!syncResult && (
            <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2 border border-dashed border-border rounded-lg">
              <RefreshCw className="h-5 w-5 animate-spin text-emerald-500" />
              <p className="text-xs">Fetching real-time collection catalog from USGS STAC Server (landsatlook.usgs.gov)...</p>
            </div>
          )}

          {syncResult && syncResult.status === "Failed" && (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs space-y-2">
              <p className="font-semibold">Unable to fetch live collections from USGS Landsat STAC API</p>
              <p className="font-mono text-[11px]">{syncResult.source}</p>
              <Button size="sm" variant="outline" onClick={handleTriggerSync} className="h-7 text-xs gap-1 mt-1">
                <RefreshCw className="h-3 w-3" /> Retry Live Fetch
              </Button>
            </div>
          )}

          {syncResult?.collections && syncResult.collections.length > 0 && (
            <div className="pt-2 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Live Products From USGS STAC Server
                  </p>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-mono">
                    {filteredCollections.length} of {syncResult.collections.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Filter collections..."
                      value={stacSearch}
                      onChange={(e) => setStacSearch(e.target.value)}
                      className="pl-8 h-7 text-xs"
                    />
                  </div>
                  <Button size="sm" variant="outline" asChild className="h-7 text-xs px-2.5 gap-1">
                    <Link href="/admin/datasets">
                      Manage <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto border border-border rounded-lg max-h-64 divide-y divide-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border sticky top-0 z-10 backdrop-blur-sm">
                    <tr className="text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Collection ID</th>
                      <th className="py-2.5 px-3">Official Title & Category</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {filteredCollections.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
                          No USGS Landsat collections matching &quot;{stacSearch}&quot;
                        </td>
                      </tr>
                    ) : (
                      filteredCollections.slice(0, 10).map((col) => {
                        const cat = getProductCategoryBadge(col.id, col.title);
                        return (
                          <tr key={col.id} className="hover:bg-muted/30 transition-colors group">
                            <td className="py-2.5 px-3 font-mono font-bold text-primary whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{col.id}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopy(col.id, e)}
                                  title="Copy Collection ID"
                                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded opacity-60 hover:opacity-100"
                                >
                                  {copiedId === col.id ? (
                                    <Check className="h-3 w-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col gap-1 max-w-md">
                                <span className="text-foreground font-medium line-clamp-1">{col.title}</span>
                                <span className={`inline-flex items-center w-fit px-1.5 py-0.2 rounded text-[10px] font-semibold border ${cat.bg}`}>
                                  {cat.label}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live STAC
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedStac(col)}
                                className="h-7 px-2.5 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
                              >
                                <Eye className="h-3 w-3" /> Inspect
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {filteredCollections.length > 10 && (
                <p className="text-[11px] text-muted-foreground text-right">
                  Showing top 10 products. View all {filteredCollections.length} on the{" "}
                  <Link href="/admin/datasets" className="text-primary hover:underline font-medium">
                    Datasets Manager
                  </Link>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* STAC Collection Inspection Dialog */}
      <Dialog open={!!selectedStac} onOpenChange={(open) => !open && setSelectedStac(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Globe2 className="h-5 w-5 text-emerald-500" />
              USGS STAC Collection Metadata
            </DialogTitle>
            <DialogDescription className="text-xs">
              Live metadata attributes served from USGS Landsat STAC API
            </DialogDescription>
          </DialogHeader>
          {selectedStac && (
            <div className="space-y-4 text-xs pt-1">
              <div>
                <span className="text-muted-foreground font-medium">Collection Identifier:</span>
                <div className="flex items-center gap-2 mt-1 p-2 rounded bg-muted/60 border border-border">
                  <code className="font-mono font-bold text-primary text-xs flex-1">{selectedStac.id}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs font-medium gap-1"
                    onClick={() => handleCopy(selectedStac.id)}
                  >
                    {copiedId === selectedStac.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy ID
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground font-medium">Official Title:</span>
                <p className="text-sm font-semibold text-foreground mt-0.5">{selectedStac.title}</p>
              </div>

              {selectedStac.description && (
                <div>
                  <span className="text-muted-foreground font-medium">Description:</span>
                  <div className="p-2.5 rounded bg-muted/40 border border-border text-muted-foreground leading-relaxed mt-1 max-h-36 overflow-y-auto">
                    {selectedStac.description}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-muted/30 border border-border">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> License
                  </div>
                  <p className="font-mono text-foreground font-semibold">
                    {selectedStac.license || "Public Domain (USGS)"}
                  </p>
                </div>
                <div className="p-2.5 rounded bg-muted/30 border border-border">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1">
                    <MapPin className="h-3.5 w-3.5 text-blue-500" /> Spatial Coverage
                  </div>
                  <p className="font-mono text-foreground font-semibold truncate">
                    {selectedStac.extent?.spatial?.bbox ? "Global BBox" : "Global Extent"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <a
                  href={`https://landsatlook.usgs.gov/stac-server/collections/${selectedStac.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                >
                  USGS Raw STAC Endpoint <ExternalLink className="h-3 w-3" />
                </a>
                <Button size="sm" variant="outline" onClick={() => setSelectedStac(null)} className="h-8 text-xs font-medium px-3">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Satellite Computations */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Satellite Workflows Queue</CardTitle>
              <CardDescription className="text-xs">Live telemetry from Earth Engine & AI jobs</CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild className="gap-1 text-xs font-medium h-8">
              <Link href="/admin/jobs">
                View Queue <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground font-semibold">
                    <th className="py-2.5 px-2">Job ID</th>
                    <th className="py-2.5 px-2">User</th>
                    <th className="py-2.5 px-2">Workflow</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 px-2">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {INITIAL_JOBS.slice(0, 4).map((j) => (
                    <tr key={j.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-2 font-mono font-semibold text-primary">{j.id}</td>
                      <td className="py-2.5 px-2 text-muted-foreground">{j.user}</td>
                      <td className="py-2.5 px-2 font-medium">{j.type}</td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            j.status === "Completed"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : j.status === "Processing"
                              ? "bg-amber-500/10 text-amber-500 animate-pulse"
                              : "bg-rose-500/10 text-rose-500"
                          }`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-muted-foreground">{j.latency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Live Microservices Probe Status */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Live Endpoint Probes</span>
              <Button size="sm" variant="outline" asChild className="h-7 px-2.5 text-xs font-medium gap-1">
                <Link href="/admin/health">
                  Details <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardTitle>
            <CardDescription className="text-xs">Direct network probe results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {healthMetrics && Array.isArray(healthMetrics.services) && healthMetrics.services.length > 0 ? (
              healthMetrics.services.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">Ping: {s.latencyMs}ms</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold shrink-0">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    {s.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Probing live services...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
