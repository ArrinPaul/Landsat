"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Ban, UserCheck } from "lucide-react";
import type { UserRole } from "@/lib/auth";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "Active" | "Suspended";
  joined: string;
  lastActive: string;
};

export default function UserManagementPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [users, setUsers] = useState<ManagedUser[]>([
    { id: "usr_1", name: "Lead Geospatial Admin", email: "admin@earthinsights.nasa.gov", role: "admin", status: "Active", joined: "2026-01-10", lastActive: "Just now" },
    { id: "usr_2", name: "Dr. Sarah Jenkins", email: "sarah.j@usda.gov", role: "analyst", status: "Active", joined: "2026-02-14", lastActive: "10 mins ago" },
    { id: "usr_3", name: "Alex Rivera", email: "arivera@mit.edu", role: "analyst", status: "Active", joined: "2026-03-01", lastActive: "2 hours ago" },
    { id: "usr_4", name: "Mark Vance", email: "mvance@agritech.com", role: "viewer", status: "Active", joined: "2026-04-12", lastActive: "Yesterday" },
    { id: "usr_5", name: "Elena Rostova", email: "elena@climatewatch.org", role: "viewer", status: "Suspended", joined: "2026-05-20", lastActive: "5 days ago" },
  ]);

  const handleRoleChange = (id: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
    );
  };

  const handleToggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "Active" ? "Suspended" : "Active" }
          : u
      )
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold">User Accounts & Role Control</CardTitle>
            <CardDescription>Manage application access levels, assign roles, and audit user permissions</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search user or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-8 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-muted-foreground font-semibold">
                  <th className="py-3 px-3">User Details</th>
                  <th className="py-3 px-3">Access Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Joined Date</th>
                  <th className="py-3 px-3">Last Active</th>
                  <th className="py-3 px-3 text-right">Role Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{u.name}</p>
                          <p className="text-[11px] text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className={`h-7 px-2 text-[11px] font-semibold rounded border ${
                          u.role === "admin"
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            : u.role === "analyst"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="analyst">Analyst</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground font-mono">{u.joined}</td>
                    <td className="py-3 px-3 text-muted-foreground">{u.lastActive}</td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        size="sm"
                        variant={u.status === "Active" ? "outline" : "default"}
                        onClick={() => handleToggleStatus(u.id)}
                        className="h-7 text-[11px] gap-1"
                      >
                        {u.status === "Active" ? (
                          <>
                            <Ban className="h-3 w-3 text-rose-500" /> Suspend
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3" /> Activate
                          </>
                        )}
                      </Button>
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
