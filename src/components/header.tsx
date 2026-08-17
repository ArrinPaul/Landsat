"use client";

import Link from "next/link";
import { Globe2, LayoutDashboard, Settings, Mail, Menu, DollarSign, Shield, LogOut, User as UserIcon, LogIn } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "./ui/button";
import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { ContactSheet } from "./contact-sheet";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "@/hooks/use-language";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useAuth } from "@/components/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  const { t } = useLanguage();
  const { user, signOut, switchRole } = useAuth();
  const router = useRouter();
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
    "sticky top-0 z-50 w-full transition-all duration-300",
    isLandingPage && !isScrolled ? "bg-transparent text-white" : "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 text-foreground"
  );
  
  const buttonLinkClass = cn(
    isLandingPage && !isScrolled ? "text-white hover:bg-white/20" : ""
  );

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'analyst': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <header className={navClass}>
      <div className="container flex h-16 items-center">
        <div className="mr-auto flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <Globe2 className="h-6 w-6 text-emerald-500" />
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
            <Button variant="ghost" asChild className={buttonLinkClass}>
                <Link href="/pricing">
                    <DollarSign className="mr-2 h-4 w-4"/>
                    {t('header.pricing')}
                </Link>
            </Button>
            {user?.role === 'admin' && (
              <Button variant="ghost" asChild className={cn(buttonLinkClass, "text-rose-500 font-medium")}>
                  <Link href="/admin">
                      <Shield className="mr-2 h-4 w-4"/>
                      Admin System
                  </Link>
              </Button>
            )}
            <Button variant="ghost" asChild className={buttonLinkClass}>
                <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4"/>
                    {t('header.settings')}
                </Link>
            </Button>
        </nav>

        <div className="flex items-center justify-end space-x-3 md:ml-4">
            <div className="hidden sm:flex items-center space-x-2">
                <LanguageSwitcher className={buttonLinkClass} />
                <ThemeToggle />
                <Button variant="secondary" size="sm" onClick={() => setContactOpen(true)}>
                    <Mail className="mr-2 h-4 w-4" />
                    {t('header.contact')}
                </Button>
            </div>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 p-0">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs uppercase">
                        {user.name ? user.name.slice(0, 2) : 'US'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      <div className="pt-1">
                        <span className={`inline-block px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${getRoleBadgeColor(user.role)}`}>
                          Role: {user.role}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  {user.role === 'admin' && (
                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                      <Shield className="mr-2 h-4 w-4 text-rose-500" />
                      <span className="text-rose-500 font-semibold">Admin Panel</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase">Switch Role (Demo)</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => switchRole('viewer')} className="text-xs">
                    Set as Viewer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => switchRole('analyst')} className="text-xs">
                    Set as Analyst
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => switchRole('admin')} className="text-xs text-rose-500">
                    Set as Admin
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { signOut(); router.push('/login'); }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" asChild className="gap-2">
                <Link href="/login">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              </Button>
            )}
            
            <div className="md:hidden">
                <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className={buttonLinkClass}>
                            <Menu className="h-6 w-6" />
                            <span className="sr-only">Open menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px]">
                        <nav className="flex flex-col gap-4 mt-8">
                            <SheetClose asChild>
                                <Link href="/dashboard" className="flex items-center gap-2 text-lg font-medium">
                                    <LayoutDashboard className="h-5 w-5" /> {t('header.dashboard')}
                                </Link>
                            </SheetClose>
                            {user?.role === 'admin' && (
                              <SheetClose asChild>
                                  <Link href="/admin" className="flex items-center gap-2 text-lg font-semibold text-rose-500">
                                      <Shield className="h-5 w-5" /> Admin System
                                  </Link>
                              </SheetClose>
                            )}
                            <SheetClose asChild>
                                <Link href="/pricing" className="flex items-center gap-2 text-lg font-medium">
                                    <DollarSign className="h-5 w-5" /> {t('header.pricing')}
                                </Link>
                            </SheetClose>
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
