"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Search, Zap } from "lucide-react";

type AuditLog = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  status: "Success" | "Warning" | "Denied";
  tokensUsed?: number;
};

export default function AdminLogsPage() {
  const [search, setSearch] = useState("");
  const [logs] = useState<AuditLog[]>([
    { id: "log_1092", timestamp: "2026-08-17 14:22:01", user: "admin@earthinsights.nasa.gov", action: "User Role Modified", target: "sarah.j@usda.gov (viewer -> analyst)", status: "Success" },
    { id: "log_1091", timestamp: "2026-08-17 14:18:45", user: "analyst@nasa.gov", action: "Genkit AI Chatbot Query", target: "Crop Yield Agent Flow", status: "Success", tokensUsed: 420 },
    { id: "log_1090", timestamp: "2026-08-17 14:12:30", user: "researcher@mit.edu", action: "NDVI Computation", target: "Lat: 40.7128, Lon: -74.0060", status: "Success", tokensUsed: 120 },
    { id: "log_1089", timestamp: "2026-08-17 14:05:10", user: "anonymous_ip_172.16", action: "Admin System Access Attempt", target: "/admin/users", status: "Denied" },
    { id: "log_1088", timestamp: "2026-08-17 13:50:22", user: "field.tech@usda.gov", action: "Soil Moisture Prediction", target: "Lat: 34.0522, Lon: -118.2437", status: "Success", tokensUsed: 310 },
  ]);

  const filteredLogs = logs.filter(
    (l) =>
      l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.target.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" /> System Audit & AI Token Logs
            </CardTitle>
            <CardDescription>Security events, role edits, and LLM Genkit AI token usage breakdown</CardDescription>
          </div>
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search action, user, or target..."
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
                  <th className="py-3 px-3">Log ID</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">User / IP</th>
                  <th className="py-3 px-3">Action Event</th>
                  <th className="py-3 px-3">Target Details</th>
                  <th className="py-3 px-3">Tokens Used</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-muted-foreground">{l.id}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">{l.timestamp}</td>
                    <td className="py-3 px-3 font-medium text-foreground">{l.user}</td>
                    <td className="py-3 px-3 font-semibold">{l.action}</td>
                    <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">{l.target}</td>
                    <td className="py-3 px-3 font-mono">
                      {l.tokensUsed ? (
                        <span className="text-amber-500 font-bold flex items-center gap-1">
                          <Zap className="h-3 w-3" /> {l.tokensUsed}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-3">
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
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
