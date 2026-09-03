"use client";

import { Save, BellRing, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettingsPage() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "This is a mock settings page. Settings were not actually saved.",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground text-sm">Manage application-wide configurations.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>Maintenance Mode</CardTitle>
            </div>
            <CardDescription>
              Take the system offline for non-admin users to perform database upgrades or maintenance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Users will see a maintenance screen.
                </p>
              </div>
              <Switch />
            </div>
            <div className="space-y-2 pt-2">
              <Label>Maintenance Message</Label>
              <Input placeholder="We are currently performing scheduled maintenance..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              <CardTitle>System Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure automated alerts sent to administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New User Registrations</Label>
                <p className="text-sm text-muted-foreground">
                  Receive an email when a new user joins.
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Analytics Report</Label>
                <p className="text-sm text-muted-foreground">
                  Get a weekly summary of system usage.
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Critical Error Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Immediate notification if an API service fails.
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
