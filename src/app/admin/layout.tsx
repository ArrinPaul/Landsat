"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { Shield, Users, Activity, Cpu, FileText, Database, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Guard against non-admin role view in client side
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="p-4 rounded-full bg-rose-500/10 text-rose-500 mb-4">
            <AlertCircle className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Access Restricted</h1>
          <p className="text-muted-foreground max-w-md mt-2 mb-6">
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
    { label: "Landsat Compute Jobs", href: "/admin/jobs", icon: Cpu },
    { label: "AI & System Logs", href: "/admin/logs", icon: FileText },
    { label: "System Health", href: "/admin/health", icon: Database },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      <div className="flex-1 container py-8">
        <div className="flex items-center gap-3 pb-6 border-b">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <Shield className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Earth Insights Admin System</h1>
            <p className="text-xs text-muted-foreground">Management console for users, compute resources & AI usage</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mt-6">
          {/* Admin Sidebar Navigation */}
          <aside className="md:col-span-1 space-y-1">
            <nav className="flex flex-col space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow"
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

          {/* Main Admin Content View */}
          <main className="md:col-span-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
