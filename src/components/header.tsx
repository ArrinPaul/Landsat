"use client";

import Link from "next/link";
import { Globe2, LayoutDashboard, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "./ui/button";
import React, { useState, useEffect } from "react";
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { ContactSheet } from "./contact-sheet";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "@/hooks/use-language";
import { AuthNav } from "@/components/auth-nav";
import { Sheet, SheetContent, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export function Header() {
  const { t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  const [isContactOpen, setContactOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const lastScrollY = React.useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 10);
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollY.current) {
        setScrollDirection('up');
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navClass = cn(
    "top-0 z-50 w-full transition-all duration-300",
    isLandingPage ? "fixed" : "sticky",
    isLandingPage && !isScrolled ? "bg-transparent text-white" : "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 text-foreground",
    scrollDirection === 'down' ? "-translate-y-full" : "translate-y-0"
  );
  
  const buttonLinkClass = cn(
    isLandingPage && !isScrolled ? "text-white hover:bg-white/20" : ""
  );

  return (
    <header className={navClass}>
      <div className="container px-4 md:px-6 flex h-16 items-center">
        <div className="mr-auto flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <Globe2 className="h-6 w-6" />
            <span className="font-bold text-lg">{t('header.title')}</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center space-x-2">
            <Button variant="ghost" asChild className={buttonLinkClass}>
                <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4"/>
                    {t('header.dashboard')}
                </Link>
            </Button>
        </nav>

        <div className="flex items-center justify-end space-x-2 md:ml-4">
            <div className="hidden sm:flex items-center space-x-2">
                <LanguageSwitcher className={buttonLinkClass} />
                <ThemeToggle />
                <AuthNav onContactClick={() => setContactOpen(true)} className={buttonLinkClass} />
            </div>
            
            <div className="md:hidden">
                <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className={buttonLinkClass}>
                            <Menu className="h-6 w-6" />
                            <span className="sr-only">Open menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px]">
                        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                        <nav className="flex flex-col gap-4 mt-8">
                            <SheetClose asChild>
                                <Link href="/dashboard" className="flex items-center gap-2 text-lg font-medium">
                                    <LayoutDashboard className="h-5 w-5" /> {t('header.dashboard')}
                                </Link>
                            </SheetClose>
                            <div className="flex items-center justify-between pt-4 border-t">
                                <LanguageSwitcher />
                                <ThemeToggle />
                            </div>
                            <div className="pt-2 border-t">
                                <AuthNav variant="stacked" onContactClick={() => setContactOpen(true)} />
                            </div>
                        </nav>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
      </div>
      <ContactSheet open={isContactOpen} onOpenChange={setContactOpen} />
    </header>
  );
}
