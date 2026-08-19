"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Zap,
  Download,
  User,
  Layers,
  Settings,
  ShieldAlert,
  CheckCircle2,
  X,
} from "lucide-react";
import { INITIAL_LOGS } from "@/lib/admin-data";

export default function AdminLogsPage() {
  const [logs] = useState(INITIAL_LOGS);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "user" | "dataset" | "system" | "security">("all");
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExportCSV = () => {
    const headers = ["Log ID", "Timestamp", "User/Actor", "Action Event", "Target Details", "Type", "Status", "Tokens Used"];
    const rows = logs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.user}"`,
      `"${l.action}"`,
      `"${l.target}"`,
      l.type,
      l.status,
      l.tokensUsed || 0,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `landsat_audit_logs_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Activity logs exported to CSV.");
  };

  const filteredLogs = logs.filter((l) => {
    const query = search.toLowerCase();
    const matchesSearch =
      l.user.toLowerCase().includes(query) ||
      l.action.toLowerCase().includes(query) ||
      l.target.toLowerCase().includes(query) ||
      l.id.toLowerCase().includes(query);
    const matchesFilter = filterType === "all" || l.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "user":
        return User;
      case "dataset":
        return Layers;
      case "security":
        return ShieldAlert;
      default:
        return Settings;
    }
  };

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
          <p className="text-xs font-medium text-muted-foreground uppercase">Total Activities</p>
          <p className="text-2xl font-bold text-foreground mt-1">{logs.length}</p>
        </Card>
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">User Actions</p>
          <p className="text-2xl font-bold text-blue-500 mt-1">
            {logs.filter((l) => l.type === "user").length}
          </p>
        </Card>
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Dataset & AI Events</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">
            {logs.filter((l) => l.type === "dataset").length}
          </p>
        </Card>
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Security Audits</p>
          <p className="text-2xl font-bold text-rose-500 mt-1">
            {logs.filter((l) => l.type === "security").length}
          </p>
        </Card>
      </div>

      {/* Logs Table Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Activity & Audit Logs
            </CardTitle>
            <CardDescription>
              Security events, catalog synchronization, user role modifications, and AI token tracking
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="gap-1.5 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" /> Export Logs
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search and Category Filter Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by action, user, IP, or target..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(["all", "user", "dataset", "system", "security"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    filterType === type
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {type === "all"
                    ? "All Events"
                    : type === "user"
                    ? "User Actions"
                    : type === "dataset"
                    ? "Dataset & AI"
                    : type === "system"
                    ? "System"
                    : "Security"}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-muted-foreground font-semibold">
                  <th className="py-3 px-3">Log ID</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">User / Actor</th>
                  <th className="py-3 px-3">Action Event</th>
                  <th className="py-3 px-3">Target Details</th>
                  <th className="py-3 px-3">AI Tokens</th>
                  <th className="py-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((l) => {
                  const Icon = getIcon(l.type);
                  return (
                    <tr key={l.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-muted-foreground">{l.id}</td>
                      <td className="py-3 px-3 font-mono text-muted-foreground text-[11px]">{l.timestamp}</td>
                      <td className="py-3 px-3 font-medium text-foreground">{l.user}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-primary" /> {l.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground font-mono text-[11px] max-w-[200px] truncate">
                        {l.target}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {l.tokensUsed ? (
                          <span className="text-amber-500 font-bold flex items-center gap-1">
                            <Zap className="h-3 w-3" /> {l.tokensUsed}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            l.status === "Success"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : l.status === "Warning"
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-10 border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground">No activity logs matching your filter</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
