"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Session = { authenticated: boolean; role?: string };

export function AuthNav({ className, variant = "inline" }: { className?: string; variant?: "inline" | "stacked" }) {
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

  const wrapperClass = variant === "stacked" ? "flex flex-col gap-2" : "flex items-center gap-2";

  if (!session.authenticated) {
    return (
      <div className={wrapperClass}>
        <Button variant="secondary" size="sm" asChild className={className}>
          <Link href="/login">
            <LogIn className="mr-2 h-4 w-4" /> Sign in
          </Link>
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
      <Button variant="secondary" size="sm" onClick={handleLogout} className={className}>
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}
