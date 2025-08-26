
"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const handleNotificationToggle = async (checked: boolean) => {
    if (!("Notification" in window)) {
      toast({ title: "Unsupported", description: "This browser does not support desktop notifications.", variant: "destructive" });
      return;
    }

    if (checked) {
      if (permission === "granted") {
        setNotificationsEnabled(true);
      } else if (permission !== "denied") {
        const newPermission = await Notification.requestPermission();
        setPermission(newPermission);
        if (newPermission === "granted") {
          setNotificationsEnabled(true);
          toast({ title: "Success", description: "Notifications have been enabled." });
        } else {
            toast({ title: "Info", description: "You have blocked notifications.", variant: "destructive" });
        }
      } else {
         toast({ title: "Blocked", description: "You have previously denied notification permissions. Please enable them in your browser settings.", variant: "destructive" });
      }
    } else {
      setNotificationsEnabled(false);
      toast({ title: "Info", description: "Notifications have been disabled." });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-6">
            <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>
                Manage your preferences and application settings.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <ThemeToggle />
                </div>
                <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <Label htmlFor="notifications">Satellite Pass Alerts</Label>
                    <p className="text-xs text-muted-foreground">Receive a notification before a satellite passes over your location.</p>
                </div>
                <Switch 
                    id="notifications" 
                    checked={notificationsEnabled}
                    onCheckedChange={handleNotificationToggle}
                />
                </div>

                <div className="space-y-2 pt-6">
                <h3 className="text-lg font-semibold">About</h3>
                <p className="text-sm text-muted-foreground">
                    <strong>Earth Insights Dashboard</strong>
                </p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                    &copy; 2025 Earth Insights. All rights reserved. | Team: LunarX
                </p>
                </div>
            </CardContent>
            </Card>
      </main>
    </div>
  );
}
