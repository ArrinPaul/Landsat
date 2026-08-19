"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Users,
  Layers,
  Zap,
  Globe2,
  BarChart3,
  Sparkles,
} from "lucide-react";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"7" | "30" | "90">("30");

  const metricsByRange = {
    "7": {
      computations: "3,480",
      activeResearchers: "142",
      cacheHitRate: "94.2%",
      aiTokens: "84.5k",
      regions: [
        { name: "US Corn Belt (Iowa/Illinois)", count: 1240, pct: 36 },
        { name: "California Central Valley", count: 890, pct: 26 },
        { name: "Mekong River Delta, Vietnam", count: 520, pct: 15 },
        { name: "Indo-Gangetic Plain, India", count: 480, pct: 14 },
        { name: "Cerrado Agricultural Basin, Brazil", count: 350, pct: 9 },
      ],
      workflows: [
        { name: "NDVI Multi-Band Indices", count: 1420, pct: 41, color: "bg-emerald-500" },
        { name: "AI Crop Yield Forecasting", count: 890, pct: 26, color: "bg-primary" },
        { name: "NDWI Water Canopy Moisture", count: 580, pct: 17, color: "bg-blue-500" },
        { name: "Timelapse Video Renders", count: 340, pct: 10, color: "bg-amber-500" },
        { name: "Thermal LST Land Heat", count: 250, pct: 6, color: "bg-rose-500" },
      ],
    },
    "30": {
      computations: "18,920",
      activeResearchers: "488",
      cacheHitRate: "96.5%",
      aiTokens: "328.4k",
      regions: [
        { name: "US Corn Belt (Iowa/Illinois)", count: 6840, pct: 36 },
        { name: "California Central Valley", count: 4920, pct: 26 },
        { name: "Mekong River Delta, Vietnam", count: 2840, pct: 15 },
        { name: "Indo-Gangetic Plain, India", count: 2650, pct: 14 },
        { name: "Cerrado Agricultural Basin, Brazil", count: 1670, pct: 9 },
      ],
      workflows: [
        { name: "NDVI Multi-Band Indices", count: 7750, pct: 41, color: "bg-emerald-500" },
        { name: "AI Crop Yield Forecasting", count: 4920, pct: 26, color: "bg-primary" },
        { name: "NDWI Water Canopy Moisture", count: 3220, pct: 17, color: "bg-blue-500" },
        { name: "Timelapse Video Renders", count: 1890, pct: 10, color: "bg-amber-500" },
        { name: "Thermal LST Land Heat", count: 1140, pct: 6, color: "bg-rose-500" },
      ],
    },
    "90": {
      computations: "56,410",
      activeResearchers: "1,248",
      cacheHitRate: "97.1%",
      aiTokens: "1.12M",
      regions: [
        { name: "US Corn Belt (Iowa/Illinois)", count: 20300, pct: 36 },
        { name: "California Central Valley", count: 14660, pct: 26 },
        { name: "Mekong River Delta, Vietnam", count: 8460, pct: 15 },
        { name: "Indo-Gangetic Plain, India", count: 7900, pct: 14 },
        { name: "Cerrado Agricultural Basin, Brazil", count: 5090, pct: 9 },
      ],
      workflows: [
        { name: "NDVI Multi-Band Indices", count: 23130, pct: 41, color: "bg-emerald-500" },
        { name: "AI Crop Yield Forecasting", count: 14670, pct: 26, color: "bg-primary" },
        { name: "NDWI Water Canopy Moisture", count: 9590, pct: 17, color: "bg-blue-500" },
        { name: "Timelapse Video Renders", count: 5640, pct: 10, color: "bg-amber-500" },
        { name: "Thermal LST Land Heat", count: 3380, pct: 6, color: "bg-rose-500" },
      ],
    },
  };

  const current = metricsByRange[timeRange];

  return (
    <div className="space-y-6">
      {/* Header with Time Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Analytics & Satellite Telemetry
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Geospatial computation patterns, user engagement, and AI token distribution
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg border border-border">
          {(["7", "30", "90"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                timeRange === range
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {range === "7" ? "Past 7 Days" : range === "30" ? "Past 30 Days" : "Past Quarter (90D)"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase">Total Computations</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{current.computations}</p>
          <span className="text-[10px] text-emerald-500 font-semibold">+22% vs previous period</span>
        </Card>

        <Card className="border-border shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase">Active Researchers</p>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{current.activeResearchers}</p>
          <span className="text-[10px] text-blue-500 font-semibold">Across 42 organizations</span>
        </Card>

        <Card className="border-border shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase">Tile Cache Hit Rate</p>
            <Layers className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{current.cacheHitRate}</p>
          <span className="text-[10px] text-muted-foreground font-semibold">Sub-100ms response</span>
        </Card>

        <Card className="border-border shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase">AI Tokens (Genkit)</p>
            <Zap className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{current.aiTokens}</p>
          <span className="text-[10px] text-indigo-500 font-semibold">Gemini 1.5 Pro & Flash</span>
        </Card>
      </div>

      {/* Distribution Charts & Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Computations by Geographic Region */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-emerald-500" /> Computations by Geographic Region
            </CardTitle>
            <CardDescription className="text-xs">Most analyzed agricultural zones and coordinates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {current.regions.map((reg) => (
              <div key={reg.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-foreground truncate max-w-[240px]">{reg.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">{reg.count.toLocaleString()} jobs</span>
                    <span className="font-bold text-foreground w-8 text-right">{reg.pct}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${reg.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Computations by Spectral Workflow */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Workflows by Spectral Transform
            </CardTitle>
            <CardDescription className="text-xs">Distribution of algorithm and AI model usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {current.workflows.map((wf) => (
              <div key={wf.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-foreground">{wf.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">{wf.count.toLocaleString()} calls</span>
                    <span className="font-bold text-foreground w-8 text-right">{wf.pct}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${wf.color} transition-all duration-500`}
                    style={{ width: `${wf.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
