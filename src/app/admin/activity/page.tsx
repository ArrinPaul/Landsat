"use client";

import { useEffect, useState } from "react";
import { Loader2, Activity, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EventRow = {
  id: string;
  event_type: string;
  metadata: any;
  created_at: string;
  users: {
    name: string;
    email: string;
  };
};

export default function AdminActivityPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({ page: String(page) });
    if (eventTypeFilter !== "all") params.set("type", eventTypeFilter);

    fetch(`/api/admin/activity?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        setEvents(json.events ?? []);
        setTotalPages(json.totalPages ?? 1);
        setTotal(json.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [page, eventTypeFilter]);

  const handleExportCSV = () => {
    if (events.length === 0) return;
    
    const headers = ["Timestamp", "Event Type", "User Name", "User Email", "Metadata"];
    const rows = events.map(ev => [
      new Date(ev.created_at).toISOString(),
      ev.event_type,
      `"${(ev.users?.name || 'Unknown').replace(/"/g, '""')}"`,
      `"${(ev.users?.email || '').replace(/"/g, '""')}"`,
      ev.metadata ? `"${JSON.stringify(ev.metadata).replace(/"/g, '""')}"` : ""
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity Logs</h1>
          <p className="text-muted-foreground text-sm">{total} total system events.</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} disabled={events.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={eventTypeFilter}
          onValueChange={(v) => {
            setPage(1);
            setEventTypeFilter(v);
          }}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="signup">Signup</SelectItem>
            <SelectItem value="password_reset_requested">Password Reset Requested</SelectItem>
            <SelectItem value="admin_updated_account">Admin Updated Account</SelectItem>
            <SelectItem value="started_metrics_computation">Started Metrics Computation</SelectItem>
            <SelectItem value="deleted_account">Deleted Account</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              No activity logs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {new Date(ev.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {ev.event_type.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{ev.users?.name || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground">{ev.users?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground max-w-xs truncate">
                        {ev.metadata ? JSON.stringify(ev.metadata) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
