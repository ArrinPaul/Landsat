
"use client";

import Link from "next/link";
import { Globe2, LayoutDashboard, Settings, Mail, Menu, BrainCircuit, Sprout, ChevronDown } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Header() {
  const { t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  const [isContactOpen, setContactOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navClass = cn(
    "top-0 z-50 w-full transition-all duration-300",
    isLandingPage ? "fixed" : "sticky",
    isLandingPage && !isScrolled ? "bg-transparent text-white" : "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 text-foreground"
  );
  
  const buttonLinkClass = cn(
    isLandingPage && !isScrolled ? "text-white hover:bg-white/20" : ""
  );

  return (
    <header className={navClass}>
      <div className="container flex h-16 items-center">
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
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className={buttonLinkClass}>
                        <BrainCircuit className="mr-2 h-4 w-4"/>
                        {t('header.tools')}
                        <ChevronDown className="ml-1 h-3 w-3 opacity-70"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                        <Link href="/predict" className="flex items-center gap-2 cursor-pointer">
                            <BrainCircuit className="h-4 w-4"/> {t('header.predict')}
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/crop-advisor" className="flex items-center gap-2 cursor-pointer">
                            <Sprout className="h-4 w-4"/> {t('header.cropAdvisor')}
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" asChild className={buttonLinkClass}>
                <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4"/>
                    {t('header.settings')}
                </Link>
            </Button>
        </nav>

        <div className="flex items-center justify-end space-x-2 md:ml-4">
            <div className="hidden sm:flex items-center space-x-2">
                <LanguageSwitcher className={buttonLinkClass} />
                <ThemeToggle />
                 <Button variant="secondary" size="sm" onClick={() => setContactOpen(true)}>
                    <Mail className="mr-2 h-4 w-4" />
                    {t('header.contact')}
                </Button>
                <AuthNav className={buttonLinkClass} />
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
                            <div className="pt-2">
                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{t('header.tools')}</p>
                                <div className="flex flex-col gap-4 pl-1">
                                    <SheetClose asChild>
                                        <Link href="/predict" className="flex items-center gap-2 text-lg font-medium">
                                            <BrainCircuit className="h-5 w-5" /> {t('header.predict')}
                                        </Link>
                                    </SheetClose>
                                    <SheetClose asChild>
                                        <Link href="/crop-advisor" className="flex items-center gap-2 text-lg font-medium">
                                            <Sprout className="h-5 w-5" /> {t('header.cropAdvisor')}
                                        </Link>
                                    </SheetClose>
                                </div>
                            </div>
                            <SheetClose asChild>
                                <Link href="/settings" className="flex items-center gap-2 text-lg font-medium">
                                    <Settings className="h-5 w-5" /> {t('header.settings')}
                                </Link>
                            </SheetClose>
                            <SheetClose asChild>
                                <Button variant="ghost" className="w-full justify-start gap-2 text-lg font-medium" onClick={() => setContactOpen(true)}>
                                    <Mail className="h-5 w-5" /> {t('header.contact')}
                                </Button>
                            </SheetClose>
                            <div className="flex items-center justify-between pt-4 border-t">
                                <LanguageSwitcher />
                                <ThemeToggle />
                            </div>
                            <div className="pt-2 border-t">
                                <AuthNav variant="stacked" />
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
