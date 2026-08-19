"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Cpu,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  Download,
  Trash2,
  CheckCircle2,
  X,
} from "lucide-react";
import { INITIAL_JOBS, type AdminComputeJob } from "@/lib/admin-data";

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminComputeJob[]>(INITIAL_JOBS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRetry = (id: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: "Processing", latency: "-" } : j))
    );
    showNotification(`Job ${id} queued for retry execution.`);

    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id ? { ...j, status: "Completed", latency: "1.6s", tokensUsed: 140 } : j
        )
      );
      showNotification(`Job ${id} retry completed successfully.`);
    }, 1800);
  };

  const handleClearCompleted = () => {
    setJobs((prev) => prev.filter((j) => j.status !== "Completed"));
    showNotification("Cleared completed jobs from live queue.");
  };

  const handleExportCSV = () => {
    const headers = ["Job ID", "User", "Workflow Type", "Status", "Latency", "Timestamp", "Tokens Used"];
    const rows = jobs.map((j) => [
      j.id,
      `"${j.user}"`,
      `"${j.type}"`,
      j.status,
      j.latency,
      `"${j.timestamp}"`,
      j.tokensUsed || 0,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `landsat_jobs_queue_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Jobs exported to CSV.");
  };

  const filteredJobs = jobs.filter((j) => {
    const query = search.toLowerCase();
    const matchesSearch =
      j.id.toLowerCase().includes(query) ||
      j.user.toLowerCase().includes(query) ||
      j.type.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Total Workflows</p>
          <p className="text-2xl font-bold text-foreground mt-1">{jobs.length}</p>
        </Card>
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Completed</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">
            {jobs.filter((j) => j.status === "Completed").length}
          </p>
        </Card>
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Processing</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">
            {jobs.filter((j) => j.status === "Processing").length}
          </p>
        </Card>
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Failed / Errored</p>
          <p className="text-2xl font-bold text-rose-500 mt-1">
            {jobs.filter((j) => j.status === "Failed").length}
          </p>
        </Card>
      </div>

      {/* Main Jobs Queue Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-500" /> Earth Engine & AI Compute Queue
            </CardTitle>
            <CardDescription>
              Live task queue, execution latency tracking, and retry governance
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="gap-1.5 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearCompleted}
              className="gap-1.5 text-xs font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear Done
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by job ID, requester, or workflow..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Processing">Processing</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-muted-foreground font-semibold">
                  <th className="py-3 px-3">Job ID</th>
                  <th className="py-3 px-3">Requester</th>
                  <th className="py-3 px-3">Workflow Type</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Compute Latency</th>
                  <th className="py-3 px-3">AI Tokens</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-primary">{j.id}</td>
                    <td className="py-3 px-3 text-muted-foreground font-medium">{j.user}</td>
                    <td className="py-3 px-3 font-semibold text-foreground">{j.type}</td>
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
                    <td className="py-3 px-3 font-mono">
                      {j.tokensUsed ? (
                        <span className="text-amber-500 font-bold flex items-center gap-1">
                          <Zap className="h-3 w-3" /> {j.tokensUsed}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground text-[11px]">{j.timestamp}</td>
                    <td className="py-3 px-3 text-right">
                      {j.status === "Failed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(j.id)}
                          className="h-7 text-[11px] gap-1 border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                        >
                          <RefreshCw className="h-3 w-3" /> Retry
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-10 border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground">No compute jobs matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
