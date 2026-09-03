
"use client";

import { Dashboard } from "@/components/dashboard";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import React from "react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/20 overflow-x-hidden w-full">
      <Header />
      <main className="flex-1 w-full max-w-full">
        <Dashboard />
      </main>
      <Footer />
    </div>
  );
}
