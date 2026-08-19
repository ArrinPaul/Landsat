"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Save,
  Shield,
  KeyRound,
  Users,
  CheckCircle2,
  Trash2,
  Lock,
  UserPlus,
  Eye,
  EyeOff,
  Settings,
} from "lucide-react";
import { INITIAL_ADMINS, type AdminAccount } from "@/lib/admin-data";

export default function AdminSettingsPage() {
  const [admins, setAdmins] = useState<AdminAccount[]>(INITIAL_ADMINS);
  const [notification, setNotification] = useState<string | null>(null);

  // System parameters
  const [settingsForm, setSettingsForm] = useState({
    syncIntervalHours: 12,
    maxConcurrentJobs: 50,
    maintenanceMode: false,
    telemetryEnabled: true,
    cacheTtlMinutes: 120,
  });

  // Add Admin form
  const [newAdminForm, setNewAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Change password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showNotification("System settings saved and applied successfully.");
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminForm.name || !newAdminForm.email || !newAdminForm.password) {
      return;
    }
    if (newAdminForm.password !== newAdminForm.confirmPassword) {
      showNotification("Admin passwords do not match.");
      return;
    }

    const created: AdminAccount = {
      id: `adm_${Math.floor(1000 + Math.random() * 9000)}`,
      name: newAdminForm.name,
      email: newAdminForm.email,
      createdAt: new Date().toISOString().substring(0, 10),
      isSuperAdmin: false,
    };

    setAdmins((prev) => [...prev, created]);
    setNewAdminForm({ name: "", email: "", password: "", confirmPassword: "" });
    showNotification(`New administrator account ${created.email} created.`);
  };

  const handleDeleteAdmin = (id: string) => {
    if (admins.length <= 1) {
      showNotification("Cannot delete the only remaining admin account.");
      return;
    }
    setAdmins((prev) => prev.filter((a) => a.id !== id));
    showNotification("Administrator account removed.");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification("New passwords do not match.");
      return;
    }
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    showNotification("Admin password updated successfully.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-emerald-500" /> Admin System Settings & Access
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure background sync jobs, manage administrator accounts, and update security credentials
        </p>
      </div>

      {notification && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* System Settings Form */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Earth Engine Pipeline Parameters
          </CardTitle>
          <CardDescription className="text-xs">
            Global limits and synchronization cadences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sync-cadence">Landsat STAC Sync Cadence (Hours)</Label>
                <Input
                  id="sync-cadence"
                  type="number"
                  min={1}
                  max={168}
                  value={settingsForm.syncIntervalHours}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, syncIntervalHours: Number(e.target.value) })
                  }
                  className="text-xs h-9"
                />
                <p className="text-[11px] text-muted-foreground">Frequency of catalog refresh from USGS</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max-jobs">Max Concurrent Compute Workflows</Label>
                <Input
                  id="max-jobs"
                  type="number"
                  min={5}
                  max={200}
                  value={settingsForm.maxConcurrentJobs}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, maxConcurrentJobs: Number(e.target.value) })
                  }
                  className="text-xs h-9"
                />
                <p className="text-[11px] text-muted-foreground">Rate limit for parallel Earth Engine calls</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cache-ttl">Tile Memory Cache TTL (Minutes)</Label>
                <Input
                  id="cache-ttl"
                  type="number"
                  min={10}
                  max={1440}
                  value={settingsForm.cacheTtlMinutes}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, cacheTtlMinutes: Number(e.target.value) })
                  }
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-2">
                <Label>System Feature Flags</Label>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.telemetryEnabled}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, telemetryEnabled: e.target.checked })
                      }
                      className="rounded border-border"
                    />
                    <span className="text-foreground">Enable Real-Time AI Genkit Telemetry</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.maintenanceMode}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, maintenanceMode: e.target.checked })
                      }
                      className="rounded border-border text-rose-500"
                    />
                    <span className="text-foreground">Maintenance Mode (Block non-admin compute jobs)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button size="sm" type="submit" className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> Save Configuration
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Admin Accounts Management & Add Admin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Administrator Accounts Directory */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-500" /> Admin Accounts Directory
            </CardTitle>
            <CardDescription className="text-xs">Privileged users with full system access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-2">
              {admins.map((adm) => (
                <div
                  key={adm.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{adm.name}</p>
                      {adm.isSuperAdmin && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">{adm.email}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">Added {adm.createdAt}</p>
                  </div>

                  {!adm.isSuperAdmin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteAdmin(adm.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                      title="Remove Admin"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Provision New Admin Form */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Provision New Admin
            </CardTitle>
            <CardDescription className="text-xs">Grant administrator credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAdmin} className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label htmlFor="new-admin-name">Admin Name</Label>
                <Input
                  id="new-admin-name"
                  placeholder="e.g. Flight Ops Admin"
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                  required
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-admin-email">Admin Email / Username</Label>
                <Input
                  id="new-admin-email"
                  type="email"
                  placeholder="e.g. admin.ops@nasa.gov"
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                  required
                  className="text-xs h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="new-admin-pass">Password</Label>
                  <div className="relative">
                    <Input
                      id="new-admin-pass"
                      type={showAdminPass ? "text" : "password"}
                      placeholder="••••••••"
                      value={newAdminForm.password}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                      required
                      className="text-xs h-9 pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showAdminPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-admin-confirm">Confirm Password</Label>
                  <Input
                    id="new-admin-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={newAdminForm.confirmPassword}
                    onChange={(e) =>
                      setNewAdminForm({ ...newAdminForm, confirmPassword: e.target.value })
                    }
                    required
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" type="submit" className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" /> Add Admin
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Admin Security & Password Change Form */}
      <Card className="border-border shadow-sm max-w-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-500" /> Change Active Admin Password
          </CardTitle>
          <CardDescription className="text-xs">Update your current administrator login credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="curr-pass">Current Admin Password</Label>
              <div className="relative">
                <Input
                  id="curr-pass"
                  type={showCurrentPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  required
                  className="text-xs h-9 pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="new-pass">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-pass"
                    type={showNewPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    required
                    className="text-xs h-9 pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-new-pass">Confirm New Password</Label>
                <Input
                  id="confirm-new-pass"
                  type="password"
                  placeholder="••••••••"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  required
                  className="text-xs h-9"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button size="sm" type="submit" className="gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
