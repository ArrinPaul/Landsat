"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import {
  Shield,
  Users,
  Activity,
  Cpu,
  FileText,
  Database,
  BarChart3,
  Gauge,
  Settings,
  Layers,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Guard against non-admin role view on client side
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-4">
            <AlertCircle className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Access Restricted</h1>
          <p className="text-muted-foreground max-w-md mt-2 mb-6 text-sm">
            You require <span className="font-semibold text-rose-500">Admin</span> privileges to access the Earth Insights management console. Current role: <span className="uppercase font-bold">{user.role}</span>.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Overview", href: "/admin", icon: Activity },
    { label: "User Management", href: "/admin/users", icon: Users },
    { label: "Datasets & Pipelines", href: "/admin/datasets", icon: Layers },
    { label: "Compute Jobs Queue", href: "/admin/jobs", icon: Cpu },
    { label: "Analytics & Usage", href: "/admin/analytics", icon: BarChart3 },
    { label: "Performance & ML", href: "/admin/performance", icon: Gauge },
    { label: "Activity & Audit Logs", href: "/admin/logs", icon: FileText },
    { label: "System Health", href: "/admin/health", icon: Database },
    { label: "Admin Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 container py-6 max-w-7xl">
        {/* Admin Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Shield className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Earth Insights Admin Console
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Centralized control plane for Landsat telemetry, user directory, AI pipelines & infrastructure
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
          {/* Admin Sidebar Navigation */}
          <aside className="lg:col-span-1 space-y-1">
            <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Admin Content Area */}
          <main className="lg:col-span-4 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
