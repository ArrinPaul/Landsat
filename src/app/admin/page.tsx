"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Cpu, Activity, Server, Zap, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminOverviewPage() {
  const stats = [
    { title: "Total Users", value: "1,248", change: "+14% this month", icon: Users, color: "text-blue-500" },
    { title: "Active Landsat Jobs", value: "42", change: "Running on Earth Engine", icon: Cpu, color: "text-emerald-500" },
    { title: "AI Token Usage (Genkit)", value: "328.4k", change: "98.2% success rate", icon: Zap, color: "text-amber-500" },
    { title: "System Health", value: "99.9%", change: "All microservices operational", icon: Server, color: "text-indigo-500" },
  ];

  const recentJobs = [
    { id: "job_9481", user: "analyst@nasa.gov", type: "NDVI Computation", status: "Completed", duration: "1.4s", time: "2 mins ago" },
    { id: "job_9480", user: "field.tech@usda.gov", type: "Soil Moisture Prediction", status: "Completed", duration: "3.2s", time: "8 mins ago" },
    { id: "job_9479", user: "researcher@mit.edu", type: "Timelapse Video Render", status: "Processing", duration: "-", time: "12 mins ago" },
    { id: "job_9478", user: "viewer@earthinsights.org", type: "Crop Advice AI", status: "Completed", duration: "0.8s", time: "18 mins ago" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title} className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{s.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overview Analytics & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Landsat Compute Jobs */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Recent Landsat & AI Computations</CardTitle>
              <CardDescription>Live telemetry from satellite analytics pipeline</CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/jobs" className="gap-1 text-xs">
                View All <ArrowUpRight className="h-3.5 w-3.5" />
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
                  {recentJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-2 font-mono font-semibold text-primary">{j.id}</td>
                      <td className="py-2.5 px-2 text-muted-foreground">{j.user}</td>
                      <td className="py-2.5 px-2 font-medium">{j.type}</td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            j.status === "Completed"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-amber-500/10 text-amber-500 animate-pulse"
                          }`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-muted-foreground">{j.duration}</td>
                      <td className="py-2.5 px-2 text-muted-foreground">{j.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* System Microservices Status */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Microservices Telemetry</CardTitle>
            <CardDescription>Real-time API & DB endpoint status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: "Google Earth Engine API", status: "Operational", ping: "42ms" },
              { name: "Genkit AI (Gemini 1.5 Pro)", status: "Operational", ping: "180ms" },
              { name: "Open-Meteo Weather Service", status: "Operational", ping: "65ms" },
              { name: "Supabase Database & Auth", status: "Operational", ping: "12ms" },
            ].map((s) => (
              <div key={s.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">Ping: {s.ping}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                  {s.status}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
