"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, CheckCircle2, RefreshCw, Cpu, HardDrive, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLiveSystemHealthAction, type LiveSystemMetrics } from "@/lib/admin-actions";

export default function AdminHealthPage() {
  const [metrics, setMetrics] = useState<LiveSystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchLiveHealth = async () => {
    try {
      const data = await getLiveSystemHealthAction();
      setMetrics(data);
    } catch (err: any) {
      console.error("Live health probe error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveHealth();
    const interval = setInterval(fetchLiveHealth, 30000); // 30s live polling
    return () => clearInterval(interval);
  }, []);

  const handleRunDiagnostics = async () => {
    setRunningDiagnostics(true);
    try {
      const data = await getLiveSystemHealthAction();
      setMetrics(data);
      setNotification(`Live probes executed: All ${data.services.length} services pinged successfully.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification(`Diagnostic probe error: ${err?.message || "Failed to reach live endpoints"}`);
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const avgLatency = metrics
    ? Math.round(
        metrics.services.reduce((acc, s) => acc + s.latencyMs, 0) /
          Math.max(metrics.services.length, 1)
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-500" /> Real-Time Infrastructure & Microservice Probes
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live HTTP endpoint latency tests to USGS Landsat STAC, Open-Meteo, Supabase, and Server Runtime
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleRunDiagnostics}
          disabled={runningDiagnostics || loading}
          className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${runningDiagnostics ? "animate-spin" : ""}`} />
          {runningDiagnostics ? "Probing Endpoints..." : "Run Live Diagnostics"}
        </Button>
      </div>

      {notification && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Global Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Server Process Uptime</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xl font-bold text-foreground font-mono">
              {metrics ? formatUptime(metrics.serverUptimeSeconds) : "Measuring..."}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">
            Platform: {metrics?.serverPlatform || "Runtime"} • Node {metrics?.nodeVersion || "..."}
          </p>
        </Card>

        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Average Live Ping</p>
          <div className="flex items-center gap-2 mt-1">
            <Cpu className="h-4 w-4 text-primary" />
            <span className="text-xl font-bold text-foreground font-mono">
              {loading ? "..." : `${avgLatency} ms`}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Live roundtrip across external APIs</p>
        </Card>

        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Server Heap Memory</p>
          <div className="flex items-center gap-2 mt-1">
            <HardDrive className="h-4 w-4 text-indigo-500" />
            <span className="text-xl font-bold text-foreground font-mono">
              {metrics ? `${metrics.serverMemoryMb} MB` : "..."}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Active Next.js runtime heap</p>
        </Card>
      </div>

      {/* Live Services List */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Live External Endpoint Diagnostics
          </CardTitle>
          <CardDescription className="text-xs">
            Measured directly via live HTTP/HTTPS connection probes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && !metrics ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
              Probing live endpoints...
            </div>
          ) : (
            metrics?.services.map((s) => (
              <div
                key={s.name}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-foreground">{s.name}</p>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-muted font-medium text-muted-foreground">
                      {s.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                    {s.endpoint} • <span className="text-foreground">{s.details}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="font-mono text-xs text-foreground bg-background px-2.5 py-1 rounded border border-border font-bold">
                    {s.latencyMs} ms
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      s.status === "Operational"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> {s.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
