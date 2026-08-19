"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Cpu,
  Zap,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  Database,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  INITIAL_DATASETS,
  INITIAL_JOBS,
  INITIAL_SYNC_RUNS,
  INITIAL_USERS,
  type SyncRunLog,
} from "@/lib/admin-data";

export default function AdminOverviewPage() {
  const [syncRuns, setSyncRuns] = useState<SyncRunLog[]>(INITIAL_SYNC_RUNS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const stats = [
    { title: "Registered Users", value: INITIAL_USERS.length.toString(), change: "+18% this month", icon: Users, color: "text-blue-500", href: "/admin/users" },
    { title: "Active Landsat Datasets", value: INITIAL_DATASETS.filter(d => d.isActive).length.toString(), change: `${INITIAL_DATASETS.length} total indices configured`, icon: Layers, color: "text-emerald-500", href: "/admin/datasets" },
    { title: "Compute Jobs Running", value: INITIAL_JOBS.length.toString(), change: "98.8% success rate", icon: Cpu, color: "text-amber-500", href: "/admin/jobs" },
    { title: "AI Token Usage (Genkit)", value: "328.4k", change: "Gemini 1.5 Pro & Flash", icon: Zap, color: "text-indigo-500", href: "/admin/performance" },
  ];

  const handleTriggerSync = () => {
    setIsSyncing(true);
    setSyncMessage("Syncing Landsat Collection 2 Tier 1 catalog from USGS & Earth Engine...");

    setTimeout(() => {
      const newRun: SyncRunLog = {
        runId: `sync_${Math.floor(1000 + Math.random() * 9000)}`,
        startedAt: new Date(Date.now() - 42000).toISOString().replace("T", " ").substring(0, 19),
        finishedAt: new Date().toISOString().replace("T", " ").substring(0, 19),
        totalScenes: 1456,
        inserted: 24,
        updated: 78,
        durationSeconds: 42,
        status: "Success",
      };
      setSyncRuns((prev) => [newRun, ...prev.slice(0, 3)]);
      setIsSyncing(false);
      setSyncMessage("Catalog synchronization completed successfully (24 new scenes added, 78 updated).");
      setTimeout(() => setSyncMessage(null), 5000);
    }, 2000);
  };

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
                  <div className="text-2xl font-bold">{s.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{s.change}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Landsat Catalog Sync & Ingestion Status Widget */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-500" /> USGS Landsat Catalog Sync & Telemetry
            </CardTitle>
            <CardDescription>
              Real-time synchronization status with USGS Landsat 8/9 & Earth Engine STAC API
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Synchronizing..." : "Trigger Catalog Sync"}
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
              <span className="text-[11px] text-muted-foreground font-medium">Catalog Status</span>
              <p className="text-sm font-bold text-emerald-500 mt-0.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Active & Synced
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-[11px] text-muted-foreground font-medium">Total Scenes Tracked</span>
              <p className="text-sm font-bold text-foreground mt-0.5">14,280 Scenes</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-[11px] text-muted-foreground font-medium">Last Sync Run</span>
              <p className="text-sm font-bold text-foreground mt-0.5 font-mono">
                {syncRuns[0]?.finishedAt ? syncRuns[0].finishedAt.substring(11, 16) + " UTC" : "Just now"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-[11px] text-muted-foreground font-medium">Auto Sync Cadence</span>
              <p className="text-sm font-bold text-foreground mt-0.5">Every 12 Hours</p>
            </div>
          </div>

          {/* Recent Sync Runs Mini-Audit */}
          <div className="pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Recent Sync Runs Audit
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground font-semibold">
                    <th className="py-2 px-2">Run ID</th>
                    <th className="py-2 px-2">Finished At</th>
                    <th className="py-2 px-2">Total Scenes</th>
                    <th className="py-2 px-2">New Ingested</th>
                    <th className="py-2 px-2">Updated</th>
                    <th className="py-2 px-2">Duration</th>
                    <th className="py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {syncRuns.map((run) => (
                    <tr key={run.runId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-2 font-mono font-bold text-primary">{run.runId}</td>
                      <td className="py-2 px-2 text-muted-foreground font-mono">{run.finishedAt}</td>
                      <td className="py-2 px-2">{run.totalScenes}</td>
                      <td className="py-2 px-2 font-semibold text-emerald-500">+{run.inserted}</td>
                      <td className="py-2 px-2 text-muted-foreground">{run.updated}</td>
                      <td className="py-2 px-2 text-muted-foreground font-mono">{run.durationSeconds}s</td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {run.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Compute Jobs */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Live Satellite Computations</CardTitle>
              <CardDescription>Recent multi-spectral analysis & AI inference workflows</CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/jobs" className="gap-1 text-xs font-semibold">
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
                    <th className="py-2.5 px-2">Time</th>
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
                      <td className="py-2.5 px-2 text-muted-foreground">{j.timestamp.substring(11, 16)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Microservices Telemetry */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Microservices Status</span>
              <Button size="sm" variant="ghost" asChild className="h-7 px-2 text-xs">
                <Link href="/admin/health">Details</Link>
              </Button>
            </CardTitle>
            <CardDescription>Live health & ping latency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Google Earth Engine API", ping: "42ms", status: "Operational" },
              { name: "Genkit LLM AI Gateway", ping: "180ms", status: "Operational" },
              { name: "Open-Meteo Weather API", ping: "65ms", status: "Operational" },
              { name: "Supabase DB & Auth", ping: "12ms", status: "Operational" },
            ].map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">Ping: {s.ping}</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  {s.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
