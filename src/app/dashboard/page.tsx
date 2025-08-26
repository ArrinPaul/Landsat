
"use client";

import { Dashboard } from "@/components/dashboard";
import { Header } from "@/components/header";
import { Chatbot } from "@/components/chatbot";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <Header />
      <main className="flex-1">
        {user && <Dashboard />}
      </main>
      {user && <Chatbot />}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          &copy; 2025 Earth Insights. All rights reserved. | Team: LunarX
        </p>
      </footer>
    </div>
  );
}
