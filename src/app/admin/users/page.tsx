"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  Download,
  Trash2,
  Eye,
  UserPlus,
  Ban,
  UserCheck,
  Building,
  CheckCircle2,
  X,
} from "lucide-react";
import type { UserRole } from "@/lib/auth";
import { INITIAL_USERS, type AdminUserRecord } from "@/lib/admin-data";

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUserRecord | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // New user form state
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    role: "analyst" as UserRole,
    organization: "",
  });
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRoleChange = (id: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
    );
    showNotification("User role updated successfully.");
  };

  const handleToggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "Active" ? "Suspended" : "Active" }
          : u
      )
    );
    showNotification("User status toggled successfully.");
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
    showNotification(`User ${userToDelete.email} removed.`);
    setUserToDelete(null);
    if (selectedUser?.id === userToDelete.id) {
      setSelectedUser(null);
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email) {
      return;
    }
    const created: AdminUserRecord = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      name: newUserForm.name,
      email: newUserForm.email,
      role: newUserForm.role,
      status: "Active",
      organization: newUserForm.organization || "Independent Geospatial Research",
      joined: new Date().toISOString().substring(0, 10),
      lastActive: "Just now",
      preferences: {
        primaryGoal: "Agriculture & Crop Yield",
        defaultIndex: "NDVI",
      },
    };
    setUsers((prev) => [created, ...prev]);
    setNewUserForm({ name: "", email: "", role: "analyst", organization: "" });
    setIsAddUserOpen(false);
    showNotification(`User ${created.name} created successfully.`);
  };

  const handleExportCSV = () => {
    const headers = ["User ID", "Name", "Email", "Role", "Status", "Organization", "Joined Date", "Last Active"];
    const rows = users.map((u) => [
      u.id,
      `"${u.name}"`,
      u.email,
      u.role,
      u.status,
      `"${u.organization}"`,
      u.joined,
      `"${u.lastActive}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `landsat_users_export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Users exported to CSV successfully.");
  };

  const filteredUsers = users.filter((u) => {
    const query = search.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.id.toLowerCase().includes(query) ||
      u.organization.toLowerCase().includes(query);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Total Users</p>
          <p className="text-2xl font-bold text-foreground mt-1">{users.length}</p>
        </Card>
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Active Analysts</p>
          <p className="text-2xl font-bold text-primary mt-1">
            {users.filter((u) => u.role === "analyst" && u.status === "Active").length}
          </p>
        </Card>
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">System Admins</p>
          <p className="text-2xl font-bold text-rose-500 mt-1">
            {users.filter((u) => u.role === "admin").length}
          </p>
        </Card>
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Suspended Accounts</p>
          <p className="text-2xl font-bold text-muted-foreground mt-1">
            {users.filter((u) => u.status === "Suspended").length}
          </p>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">User Directory & Role Governance</CardTitle>
            <CardDescription>
              Control organization access, manage analyst credentials, and audit user permissions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="gap-1.5 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddUserOpen(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <UserPlus className="h-3.5 w-3.5" /> Add User
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, email, organization, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
            <div className="flex items-center gap-2">
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

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-muted-foreground font-semibold">
                  <th className="py-3 px-3">User & Organization</th>
                  <th className="py-3 px-3">Access Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Joined</th>
                  <th className="py-3 px-3">Last Active</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{u.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                          <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-0.5 truncate">
                            <Building className="h-2.5 w-2.5" /> {u.organization}
                          </p>
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
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{u.joined}</td>
                    <td className="py-3 px-3 text-muted-foreground">{u.lastActive}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setSelectedUser(u)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="View Profile Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggleStatus(u.id)}
                          className={`h-7 w-7 ${
                            u.status === "Active" ? "text-rose-500 hover:text-rose-600 hover:bg-rose-500/10" : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                          }`}
                          title={u.status === "Active" ? "Suspend Account" : "Activate Account"}
                        >
                          {u.status === "Active" ? <Ban className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setUserToDelete(u)}
                          className="h-7 w-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                          title="Delete Account"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-10 border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground">No users found matching your filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <Card
            className="max-w-lg w-full border-border shadow-xl animate-in fade-in-50 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">User Profile Metadata</CardTitle>
                <CardDescription className="text-xs">Detailed audit & preferences record</CardDescription>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedUser(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">User ID</span>
                  <p className="font-mono font-bold text-primary mt-0.5">{selectedUser.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Status</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedUser.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Full Name</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedUser.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Email</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedUser.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Organization</span>
                  <p className="text-foreground mt-0.5">{selectedUser.organization}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Assigned Role</span>
                  <p className="font-bold text-primary capitalize mt-0.5">{selectedUser.role}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Joined Date</span>
                  <p className="font-mono text-muted-foreground mt-0.5">{selectedUser.joined}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Last Active</span>
                  <p className="text-muted-foreground mt-0.5">{selectedUser.lastActive}</p>
                </div>
              </div>

              {selectedUser.preferences && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Geospatial Workspace Preferences
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Primary Focus:</span>
                      <p className="font-medium text-foreground">{selectedUser.preferences.primaryGoal || "Standard"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Default Index:</span>
                      <p className="font-mono font-semibold text-emerald-500">{selectedUser.preferences.defaultIndex || "NDVI"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Favorite Region:</span>
                      <p className="font-medium text-foreground">{selectedUser.preferences.favoriteRegion || "Global"}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedUser(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setUserToDelete(selectedUser);
                  }}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete User
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add New User Modal */}
      {isAddUserOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsAddUserOpen(false)}
        >
          <Card
            className="max-w-md w-full border-border shadow-xl animate-in fade-in-50 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Add New User Account</CardTitle>
                <CardDescription className="text-xs">Create and provision analyst or viewer access</CardDescription>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAddUserOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleAddUser}>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1">
                  <Label htmlFor="add-name">Full Name</Label>
                  <Input
                    id="add-name"
                    placeholder="e.g. Dr. Maya Patel"
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    required
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="add-email">Email Address</Label>
                  <Input
                    id="add-email"
                    type="email"
                    placeholder="e.g. mpatel@nasa.gov"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    required
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="add-org">Organization</Label>
                  <Input
                    id="add-org"
                    placeholder="e.g. European Space Agency / ICAR"
                    value={newUserForm.organization}
                    onChange={(e) => setNewUserForm({ ...newUserForm, organization: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="add-role">Initial Access Role</Label>
                  <select
                    id="add-role"
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="viewer">Viewer (Read-only)</option>
                    <option value="analyst">Analyst (Compute & Model Access)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <Button size="sm" type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" className="gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" /> Create Account
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setUserToDelete(null)}
        >
          <Card
            className="max-w-md w-full border-destructive/30 shadow-xl animate-in fade-in-50 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Confirm Account Deletion
              </CardTitle>
              <CardDescription className="text-xs">
                Are you sure you want to delete user account <strong className="text-foreground">{userToDelete.email}</strong>?
                This action is permanent and revokes all compute tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setUserToDelete(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteUser}>
                Delete User
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
