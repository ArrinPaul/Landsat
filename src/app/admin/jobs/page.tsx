"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cpu, Search, RefreshCw, CheckCircle, Clock, AlertCircle } from "lucide-react";

type ComputeJob = {
  id: string;
  user: string;
  type: string;
  status: "Completed" | "Processing" | "Failed";
  latency: string;
  timestamp: string;
};

export default function AdminJobsPage() {
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState<ComputeJob[]>([
    { id: "job_9481", user: "analyst@nasa.gov", type: "NDVI Multi-Band Computation", status: "Completed", latency: "1.4s", timestamp: "2026-08-17 14:20:12" },
    { id: "job_9480", user: "field.tech@usda.gov", type: "Soil Moisture Prediction", status: "Completed", latency: "3.2s", timestamp: "2026-08-17 14:15:45" },
    { id: "job_9479", user: "researcher@mit.edu", type: "Timelapse Video Render", status: "Processing", latency: "-", timestamp: "2026-08-17 14:10:02" },
    { id: "job_9478", user: "viewer@earthinsights.org", type: "Crop Advice AI", status: "Completed", latency: "0.8s", timestamp: "2026-08-17 14:02:18" },
    { id: "job_9477", user: "sarah.j@usda.gov", type: "NDWI Water Extraction", status: "Failed", latency: "5.1s", timestamp: "2026-08-17 13:48:30" },
  ]);

  const filteredJobs = jobs.filter(
    (j) =>
      j.id.toLowerCase().includes(search.toLowerCase()) ||
      j.user.toLowerCase().includes(search.toLowerCase()) ||
      j.type.toLowerCase().includes(search.toLowerCase())
  );

  const handleRetry = (id: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: "Processing" } : j))
    );
    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, status: "Completed", latency: "1.8s" } : j))
      );
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-500" /> Landsat Compute Jobs Monitor
            </CardTitle>
            <CardDescription>Live queue monitoring, latency tracking, and execution control</CardDescription>
          </div>
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by job ID, user, or workflow..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-8 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-muted-foreground font-semibold">
                  <th className="py-3 px-3">Job ID</th>
                  <th className="py-3 px-3">Requester</th>
                  <th className="py-3 px-3">Workflow Type</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Compute Latency</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-primary">{j.id}</td>
                    <td className="py-3 px-3 text-muted-foreground">{j.user}</td>
                    <td className="py-3 px-3 font-medium">{j.type}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          j.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : j.status === "Processing"
                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse"
                            : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        }`}
                      >
                        {j.status === "Completed" && <CheckCircle className="h-3 w-3" />}
                        {j.status === "Processing" && <Clock className="h-3 w-3" />}
                        {j.status === "Failed" && <AlertCircle className="h-3 w-3" />}
                        {j.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{j.latency}</td>
                    <td className="py-3 px-3 font-mono text-muted-foreground text-[11px]">{j.timestamp}</td>
                    <td className="py-3 px-3 text-right">
                      {j.status === "Failed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(j.id)}
                          className="h-7 text-[11px] gap-1"
                        >
                          <RefreshCw className="h-3 w-3" /> Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
