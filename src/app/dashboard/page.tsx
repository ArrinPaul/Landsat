
"use client";

import { Dashboard } from "@/components/dashboard";
import { Header } from "@/components/header";
import { useLanguage } from "@/hooks/use-language";
import Link from "next/link";
import { ContactSheet } from "@/components/contact-sheet";
import React, { useState } from "react";

export default function DashboardPage() {
  const { t } = useLanguage();
  const [isContactOpen, setContactOpen] = useState(false);
  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <Header />
      <main className="flex-1">
        <Dashboard />
      </main>
      <footer id="contact" className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          {t('footer.copyright')}
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
            <Link href="/#about" className="text-xs hover:underline underline-offset-4 text-muted-foreground">{t('footer.about')}</Link>
            <Link href="#contact" className="text-xs hover:underline underline-offset-4 text-muted-foreground" onClick={(e) => { e.preventDefault(); setContactOpen(true)}}>{t('footer.contact')}</Link>
        </nav>
      </footer>
      <ContactSheet open={isContactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
