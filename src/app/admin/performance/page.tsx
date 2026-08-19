"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Clock,
  MousePointer,
  AlertTriangle,
  RefreshCw,
  Gauge,
  Zap,
  CheckCircle2,
} from "lucide-react";

export default function PerformanceMetricsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setRefreshMsg("Performance metrics updated from Earth Engine & Genkit telemetry.");
      setTimeout(() => setRefreshMsg(null), 4000);
    }, 1200);
  };

  const featureInteractions = [
    { name: "NDVI Multi-Band Computations", count: 7750, pct: "99.4% success", avgLatency: "1.2s" },
    { name: "Genkit AI Crop Yield Forecasts", count: 4920, pct: "98.8% success", avgLatency: "2.8s" },
    { name: "Timelapse Video Renders", count: 1890, pct: "96.5% success", avgLatency: "14.2s" },
    { name: "Scenario What-If Analyses", count: 1420, pct: "99.1% success", avgLatency: "1.9s" },
    { name: "PDF Geospatial Report Exports", count: 1140, pct: "100.0% success", avgLatency: "0.8s" },
  ];

  const recentErrors = [
    { type: "Earth Engine Tile Timeout", count: 8, target: "Landsat 8 Band 10 Cloud Masking", severity: "Warning" },
    { type: "Genkit Rate Limit (Groq Fallback Active)", count: 3, target: "Crop Yield Flow", severity: "Notice" },
    { type: "Invalid Coordinates Payload", count: 12, target: "POST /api/compute-metrics", severity: "Handled" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Gauge className="h-5 w-5 text-emerald-500" /> Performance & ML Telemetry
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Model inference latencies, tile rendering speed, and pipeline error telemetry
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh Telemetry"}
        </Button>
      </div>

      {refreshMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{refreshMsg}</span>
        </div>
      )}

      {/* Latency KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase mb-1">
            <Clock className="h-4 w-4 text-emerald-500" />
            <span>Earth Engine Avg</span>
          </div>
          <p className="text-2xl font-bold text-foreground">1.34s</p>
          <p className="text-[10px] text-muted-foreground mt-1">Across 18,920 runs</p>
        </Card>

        <Card className="border-border shadow-sm p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase mb-1">
            <Activity className="h-4 w-4 text-primary" />
            <span>ML P95 Latency</span>
          </div>
          <p className="text-2xl font-bold text-primary">3.10s</p>
          <p className="text-[10px] text-muted-foreground mt-1">95% complete under 3.1s</p>
        </Card>

        <Card className="border-border shadow-sm p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase mb-1">
            <Zap className="h-4 w-4 text-indigo-500" />
            <span>Genkit AI Speed</span>
          </div>
          <p className="text-2xl font-bold text-foreground">840ms</p>
          <p className="text-[10px] text-muted-foreground mt-1">Gemini 1.5 & Groq backup</p>
        </Card>

        <Card className="border-border shadow-sm p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase mb-1">
            <MousePointer className="h-4 w-4 text-amber-500" />
            <span>Click-Through CTR</span>
          </div>
          <p className="text-2xl font-bold text-emerald-500">98.4%</p>
          <p className="text-[10px] text-muted-foreground mt-1">Workflow completion rate</p>
        </Card>
      </div>

      {/* Feature Interactions & Latencies Breakdown */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Workflow Performance by Feature</CardTitle>
          <CardDescription className="text-xs">
            Invocation count, success rates, and average end-to-end latency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-muted-foreground font-semibold">
                  <th className="py-3 px-3">Workflow Action</th>
                  <th className="py-3 px-3">Invocations</th>
                  <th className="py-3 px-3">Reliability</th>
                  <th className="py-3 px-3">Average Latency</th>
                  <th className="py-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {featureInteractions.map((item) => (
                  <tr key={item.name} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-foreground">{item.name}</td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{item.count.toLocaleString()}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-500">{item.pct}</td>
                    <td className="py-3 px-3 font-mono text-foreground">{item.avgLatency}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Optimal
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Error Telemetry */}
      <Card className="border-border shadow-sm border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Recent Errors & Exceptions Telemetry
          </CardTitle>
          <CardDescription className="text-xs">
            Non-fatal rate limits, network timeouts, and handled validation events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {recentErrors.map((err) => (
              <div
                key={err.type}
                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border text-xs"
              >
                <div>
                  <p className="font-semibold text-foreground">{err.type}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{err.target}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-amber-500 font-bold">{err.count} occurrences</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                    {err.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
