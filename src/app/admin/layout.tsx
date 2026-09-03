import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, Users, Globe2, ArrowLeft, Activity, Settings, BarChart3, ServerCog } from "lucide-react";
import { getAuthContext } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: middleware already blocks non-admins from /admin/*,
  // but every server entry point re-checks so this never depends on one gate alone.
  const auth = await getAuthContext();
  if (auth.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-64 flex-col border-r bg-card shrink-0">
        <div className="h-16 flex items-center gap-2 px-6 border-b">
          <Globe2 className="h-5 w-5 text-primary" />
          <span className="font-bold">Admin</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Users className="h-4 w-4" /> Users
          </Link>
          <Link
            href="/admin/analytics"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <BarChart3 className="h-4 w-4" /> Analytics
          </Link>
          <Link
            href="/admin/analyses"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ServerCog className="h-4 w-4" /> Analysis Jobs
          </Link>
          <Link
            href="/admin/activity"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Activity className="h-4 w-4" /> Activity Logs
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </nav>
        <div className="p-4 border-t space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-background/95 backdrop-blur sticky top-0 z-10">
          <div className="md:hidden flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-primary" />
            <span className="font-bold">Admin</span>
          </div>
          <nav className="md:hidden flex items-center gap-4 text-sm font-medium">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/users">Users</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
