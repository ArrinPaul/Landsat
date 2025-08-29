
"use client";

import Link from "next/link";
import { Mountain, LayoutDashboard, Settings, LogIn, BrainCircuit } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "./ui/button";
import React, { useState, useEffect } from "react";
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { ContactSheet } from "./contact-sheet";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "@/hooks/use-language";

export function Header() {
  const { t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  const [isContactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navClass = cn(
    "sticky top-0 z-50 w-full transition-all duration-300",
    isLandingPage && !isScrolled ? "bg-transparent text-white" : "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 text-foreground"
  );
  
  const buttonLinkClass = cn(
    isLandingPage && !isScrolled ? "text-white hover:bg-white/20" : ""
  );

  return (
    <header className={navClass}>
      <div className="container flex h-16 items-center">
        <div className="mr-8 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <Mountain className="h-6 w-6" />
            <span className="font-bold text-lg">{t('header.title')}</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
            <Button variant="ghost" asChild className={buttonLinkClass}>
                <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4"/>
                    {t('header.dashboard')}
                </Link>
            </Button>
            <Button variant="ghost" asChild className={buttonLinkClass}>
                <Link href="/predict">
                    <BrainCircuit className="mr-2 h-4 w-4"/>
                    {t('landing.hero.predictiveTools')}
                </Link>
            </Button>
            <Button variant="ghost" asChild className={buttonLinkClass}>
                <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4"/>
                    {t('header.settings')}
                </Link>
            </Button>
            <LanguageSwitcher className={buttonLinkClass} />
            <ThemeToggle />
            {isLandingPage && (
                <Button asChild size="sm">
                  <Link href="/dashboard">
                    <LogIn className="mr-2 h-4 w-4" />
                    {t('header.getStarted')}
                  </Link>
              </Button>
            )}
        </div>
      </div>
      <ContactSheet open={isContactOpen} onOpenChange={setContactOpen} />
    </header>
  );
}
