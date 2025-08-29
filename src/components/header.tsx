
"use client";

import Link from "next/link";
import { Mountain, LayoutDashboard, Settings, LogIn, Wheat } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "./ui/button";
import React, { useState, useEffect } from "react";
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { ContactSheet } from "./contact-sheet";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "@/hooks/use-language";

const scrolltoHash = function (element_id: string) {
  const element = document.getElementById(element_id.replace('#', ''))
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
  }
}

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
  
  const linkClass = cn(
      "transition-colors",
      isLandingPage && !isScrolled ? "hover:text-gray-200" : "hover:text-foreground/80"
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
        <nav className="hidden md:flex items-center space-x-2 lg:space-x-4 text-sm font-medium">
             <Button variant="link" asChild className={linkClass}>
                <Link href={isLandingPage ? "#features" : "/#features"} onClick={(e) => {
                    if (isLandingPage) {
                        e.preventDefault();
                        scrolltoHash("#features");
                    }
                }}>
                    {t('header.features')}
                </Link>
            </Button>
            <Button variant="link" asChild className={linkClass}>
                <Link href={isLandingPage ? "#about" : "/#about"} onClick={(e) => {
                     if (isLandingPage) {
                        e.preventDefault();
                        scrolltoHash("#about");
                    }
                }}>
                    {t('header.about')}
                </Link>
            </Button>
            <Button variant="link" asChild className={linkClass}>
                <Link href="#contact" onClick={(e) => {
                     e.preventDefault();
                     setContactOpen(true);
                }}>
                    {t('header.contact')}
                </Link>
            </Button>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
            <>
                <Button variant="ghost" asChild className={buttonLinkClass}>
                    <Link href="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4"/>
                        {t('header.dashboard')}
                    </Link>
                </Button>
                 <Button variant="ghost" asChild className={buttonLinkClass}>
                    <Link href="/crop-advisor">
                        <Wheat className="mr-2 h-4 w-4"/>
                        Crop Advisor
                    </Link>
                </Button>
                <Button variant="ghost" asChild className={buttonLinkClass}>
                    <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4"/>
                        {t('header.settings')}
                    </Link>
                </Button>
            </>
            <>
              <LanguageSwitcher className={buttonLinkClass} />
              <ThemeToggle />
              <Button asChild size="sm">
                  <Link href="/dashboard">
                    <LogIn className="mr-2 h-4 w-4" />
                    {t('header.getStarted')}
                  </Link>
              </Button>
            </>
        </div>
      </div>
      <ContactSheet open={isContactOpen} onOpenChange={setContactOpen} />
    </header>
  );
}
