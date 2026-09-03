"use client";

import { useEffect, useState } from "react";
import { Loader2, ServerCog, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AnalysisJob = {
  id: string;
  status: "pending" | "completed" | "error";
  input: any;
  data: any;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  failed_at: string | null;
};

export default function AdminAnalysesPage() {
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter !== "all") params.set("status", statusFilter);

    fetch(`/api/admin/analyses?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        setJobs(json.jobs ?? []);
        setTotalPages(json.totalPages ?? 1);
        setTotal(json.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [page, statusFilter]);

  const handleExportCSV = () => {
    if (jobs.length === 0) return;
    
    // Simple CSV generator
    const headers = ["ID", "Status", "Created At", "Completed At", "Error"];
    const rows = jobs.map(job => [
      job.id,
      job.status,
      new Date(job.created_at).toISOString(),
      job.completed_at ? new Date(job.completed_at).toISOString() : "",
      job.error ? `"${job.error.replace(/"/g, '""')}"` : ""
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `analysis_jobs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analysis Jobs</h1>
          <p className="text-muted-foreground text-sm">{total} jobs in the queue history.</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} disabled={jobs.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setPage(1);
            setStatusFilter(v);
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <ServerCog className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              No jobs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Input Summary</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const created = new Date(job.created_at);
                    const finished = job.completed_at ? new Date(job.completed_at) : (job.failed_at ? new Date(job.failed_at) : null);
                    const durationMs = finished ? finished.getTime() - created.getTime() : null;
                    const durationStr = durationMs ? `${(durationMs / 1000).toFixed(1)}s` : "-";

                    return (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium text-xs font-mono">
                          {job.id.split('-').slice(0, 2).join('-')}...
                        </TableCell>
                        <TableCell>
                          <Badge variant={job.status === "completed" ? "default" : job.status === "error" ? "destructive" : "secondary"}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground max-w-[200px] truncate">
                          {job.error || (job.input ? JSON.stringify(job.input) : '-')}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {created.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {durationStr}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
