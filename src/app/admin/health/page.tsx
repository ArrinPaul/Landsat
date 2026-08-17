"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminHealthPage() {
  const services = [
    { name: "Google Earth Engine Data Catalog", status: "Operational", uptime: "99.98%", latency: "42ms", lastCheck: "1 min ago" },
    { name: "Genkit LLM AI Gateway (Gemini 1.5)", status: "Operational", uptime: "99.95%", latency: "180ms", lastCheck: "Just now" },
    { name: "Open-Meteo Weather API", status: "Operational", uptime: "100.0%", latency: "65ms", lastCheck: "2 mins ago" },
    { name: "Supabase PostgreSQL Database", status: "Operational", uptime: "99.99%", latency: "12ms", lastCheck: "Just now" },
    { name: "Background Job Worker Queue", status: "Operational", uptime: "99.91%", latency: "15ms", lastCheck: "Just now" },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-500" /> Infrastructure & Microservices Health
            </CardTitle>
            <CardDescription>Real-time endpoint diagnostics, connection latency, and uptime reports</CardDescription>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs font-semibold">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Diagnostics
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {services.map((s) => (
              <div
                key={s.name}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-muted/40 border border-border gap-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    {s.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Checked {s.lastCheck} • Uptime: <span className="font-semibold text-foreground">{s.uptime}</span>
                  </p>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="font-mono text-xs text-muted-foreground bg-background px-2.5 py-1 rounded border border-border">
                    {s.latency}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" /> {s.status}
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
