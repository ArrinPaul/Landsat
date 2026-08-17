"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { ContactSheet } from "@/components/contact-sheet";
import { useAuth } from "@/components/auth-provider";
import { Target, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user, updatePreferences } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isContactOpen, setContactOpen] = useState(false);

  // Preference edit state
  const [goal, setGoal] = useState(user?.preferences?.primaryGoal || 'Agriculture & Crop Yield');
  const [org, setOrg] = useState(user?.preferences?.organizationType || 'Agricultural Enterprise');
  const [region, setRegion] = useState(user?.preferences?.favoriteRegion || 'Central Valley, California');
  const [index, setIndex] = useState(user?.preferences?.defaultIndex || 'NDVI');

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const handleSavePreferences = () => {
    updatePreferences({
      primaryGoal: goal as any,
      organizationType: org as any,
      favoriteRegion: region,
      defaultIndex: index as any,
    });
    toast({
      title: "Preferences Updated!",
      description: "Your personalized satellite workspace context has been saved.",
    });
  };

  const handleNotificationToggle = async (checked: boolean) => {
    if (!("Notification" in window)) {
      toast({ title: t('settings.notifications.unsupported.title'), description: t('settings.notifications.unsupported.description'), variant: "destructive" });
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
          toast({ title: t('settings.notifications.success.title'), description: t('settings.notifications.success.description') });
        } else {
            toast({ title: t('settings.notifications.blocked.title'), description: t('settings.notifications.blocked.info'), variant: "destructive" });
        }
      } else {
         toast({ title: t('settings.notifications.blocked.title'), description: t('settings.notifications.blocked.description'), variant: "destructive" });
      }
    } else {
      setNotificationsEnabled(false);
      toast({ title: t('settings.notifications.disabled.title'), description: t('settings.notifications.disabled.description') });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <Header />
      <main className="flex-1 p-4 md:p-6 container max-w-4xl mx-auto space-y-6">
        {/* User Account Profile Context */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center uppercase border border-primary/20">
                  {user?.name?.slice(0, 2) || "US"}
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">{user?.name}</CardTitle>
                  <CardDescription className="text-xs">{user?.email}</CardDescription>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-primary/10 text-primary border border-primary/20">
                Role: {user?.role}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-t pt-4">
              <h3 className="text-base font-bold flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-emerald-500" /> Personalized Earth Studio Preferences
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Primary Goal</label>
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Agriculture & Crop Yield">Agriculture & Crop Yield</option>
                    <option value="Water Resource Monitoring">Water Resource Monitoring</option>
                    <option value="Urban Planning & Development">Urban Planning & Development</option>
                    <option value="Wildfire & Disaster Recovery">Wildfire & Disaster Recovery</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Organization Type</label>
                  <select
                    value={org}
                    onChange={(e) => setOrg(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Government / NASA">Government / NASA</option>
                    <option value="Agricultural Enterprise">Agricultural Enterprise</option>
                    <option value="Academic / Research Institute">Academic / Research Institute</option>
                    <option value="Independent Consultant">Independent Consultant</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Default Satellite Band Index</label>
                  <select
                    value={index}
                    onChange={(e) => setIndex(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono font-bold"
                  >
                    <option value="NDVI">NDVI (Vegetation)</option>
                    <option value="NDWI">NDWI (Water)</option>
                    <option value="NDBI">NDBI (Urban)</option>
                    <option value="NBR">NBR (Wildfire)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Favorite ROI Region</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button size="sm" onClick={handleSavePreferences} className="gap-1.5 font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
                  <CheckCircle2 className="h-4 w-4" /> Save Profile Preferences
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global App System Settings */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>{t('settings.title')}</CardTitle>
            <CardDescription>{t('settings.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode">{t('settings.darkMode')}</Label>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <Label htmlFor="notifications">{t('settings.satelliteAlerts.label')}</Label>
                <p className="text-xs text-muted-foreground">{t('settings.satelliteAlerts.description')}</p>
              </div>
              <Switch 
                id="notifications" 
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationToggle}
              />
            </div>
          </CardContent>
        </Card>
      </main>

      <footer id="contact" className="py-6 w-full shrink-0 border-t bg-background">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <nav className="flex gap-4 sm:gap-6">
            <Link href="/#about" className="text-xs hover:underline underline-offset-4 text-muted-foreground">{t('footer.about')}</Link>
            <Link href="#contact" className="text-xs hover:underline underline-offset-4 text-muted-foreground" onClick={(e) => { e.preventDefault(); setContactOpen(true)}}>{t('footer.contact')}</Link>
          </nav>
          <p className="text-xs text-muted-foreground text-center">
            {t('footer.copyright')}
          </p>
          <div className="w-24 hidden sm:block"></div>
        </div>
      </footer>
      <ContactSheet open={isContactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
