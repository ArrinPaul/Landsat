"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, ShieldCheck, UserCircle, Mail, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";

type Session = { authenticated: boolean; role?: string; name?: string; email?: string };

export function AuthNav({ className, variant = "inline", onContactClick }: { className?: string; variant?: "inline" | "stacked"; onContactClick?: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then(setSession)
      .catch(() => setSession({ authenticated: false }));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast({ title: "Signed out" });
    router.push("/");
    router.refresh();
  }

  if (!session) return null;

  const wrapperClass = variant === "stacked" ? "flex flex-col gap-2 w-full" : "flex items-center gap-2";

  if (!session.authenticated) {
    return (
      <div className={wrapperClass}>
        {onContactClick && variant === "inline" && (
            <Button variant="ghost" size="sm" onClick={onContactClick} className={className}>
                <Mail className="mr-2 h-4 w-4" /> Contact
            </Button>
        )}
        <Button variant="secondary" size="sm" asChild className={className}>
          <Link href="/login">
            <LogIn className="mr-2 h-4 w-4" /> Sign in
          </Link>
        </Button>
      </div>
    );
  }

  if (variant === "stacked") {
      return (
        <div className={wrapperClass}>
          {session.role === "admin" && (
            <Button variant="ghost" size="sm" asChild className="w-full justify-start">
              <Link href="/admin">
                <ShieldCheck className="mr-2 h-4 w-4" /> Admin
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild className="w-full justify-start">
            <Link href="/settings">
              <UserCircle className="mr-2 h-4 w-4" /> Profile
            </Link>
          </Button>
          {onContactClick && (
              <Button variant="ghost" size="sm" onClick={onContactClick} className="w-full justify-start">
                  <Mail className="mr-2 h-4 w-4" /> Contact
              </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleLogout} className="w-full justify-start mt-2">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      );
  }

  return (
    <div className={wrapperClass}>
      {session.role === "admin" && (
        <Button variant="ghost" size="sm" asChild className={className}>
          <Link href="/admin">
            <ShieldCheck className="mr-2 h-4 w-4" /> Admin
          </Link>
        </Button>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className={`rounded-full ${className}`}>
             <User className="h-5 w-5" />
             <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
             <Link href="/settings" className="cursor-pointer">
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Profile</span>
             </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
             <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
             </Link>
          </DropdownMenuItem>
          {onContactClick && (
            <DropdownMenuItem onClick={onContactClick} className="cursor-pointer">
              <Mail className="mr-2 h-4 w-4" />
              <span>Contact</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
