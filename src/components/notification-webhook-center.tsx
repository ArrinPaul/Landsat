"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ShieldAlert, CheckCircle2, Send, Radio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: "warning" | "info" | "critical";
  timestamp: string;
  read: boolean;
};

export function NotificationWebhookCenter() {
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState("https://api.earthinsights.io/webhooks/alerts");
  const [webhookActive] = useState(true);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif_1",
      title: "Low Soil Moisture Warning",
      message: "Soil moisture at Iowa Corn Belt dropped below 0.20 m³/m³. Drip irrigation recommended.",
      type: "warning",
      timestamp: "10 mins ago",
      read: false,
    },
    {
      id: "notif_2",
      title: "Multi-Year Deforestation Alert",
      message: "Landsat temporal anomaly detector flagged -18% NDVI decrease over 8-year period.",
      type: "critical",
      timestamp: "1 hour ago",
      read: false,
    },
    {
      id: "notif_3",
      title: "Sentinel-2 Orbit Pass Complete",
      message: "New 10m high-res optical imagery ingested for Central Valley, California.",
      type: "info",
      timestamp: "3 hours ago",
      read: true,
    },
  ]);

  const handleTestWebhook = () => {
    toast({
      title: "Webhook Test Event Sent!",
      description: `Payload dispatched to ${webhookUrl}`,
    });
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                In-App Notification & Webhook Center
              </CardTitle>
              <CardDescription className="text-xs">Real-time alert dispatches for environmental threshold breaches</CardDescription>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={handleMarkAllRead} className="text-xs">
              Mark All Read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Webhook Configuration Bar */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-emerald-500" /> Outbound Webhook Integration
            </p>
            <Badge variant={webhookActive ? "default" : "outline"} className="text-[10px]">
              {webhookActive ? "Webhook Active" : "Disabled"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="flex-1 h-8 px-2.5 text-xs font-mono rounded-lg border border-input bg-background focus-visible:outline-none"
            />
            <Button size="sm" onClick={handleTestWebhook} className="h-8 text-xs gap-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold">
              <Send className="h-3 w-3" /> Test Webhook
            </Button>
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3 rounded-xl border transition-colors flex items-start gap-3 ${
                n.read ? "bg-background border-border" : "bg-primary/5 border-primary/20 shadow-sm"
              }`}
            >
              <div className="pt-0.5">
                {n.type === "critical" && <ShieldAlert className="h-4 w-4 text-rose-500" />}
                {n.type === "warning" && <Bell className="h-4 w-4 text-amber-500" />}
                {n.type === "info" && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
              </div>
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">{n.title}</p>
                  <span className="text-[10px] text-muted-foreground font-mono">{n.timestamp}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
