"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe2, Loader2, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TiltCard } from "@/components/tilt-card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to login");
      }

      toast({ title: "Welcome back", description: "You've been signed in." });
      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-white items-center justify-center p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-white/80 hover:text-white transition-colors">
        <Globe2 className="h-6 w-6" />
        <span className="font-bold text-lg tracking-tight">Earth Insights</span>
      </Link>
      
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
        <TiltCard>
          <div className="flex flex-col space-y-8 bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl [transform:translateZ(30px)]">
            <div className="space-y-2 text-center [transform:translateZ(10px)]">
              <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
              <p className="text-sm text-gray-400">
                Enter your credentials to access the intelligence dashboard
              </p>
            </div>
            
            <div className="[transform:translateZ(20px)]">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Email</FormLabel>
                          <FormControl>
                            <Input placeholder="you@example.com" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-12" {...field} />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                              <FormLabel className="text-gray-300">Password</FormLabel>
                              <Link href="#" className="text-sm text-primary hover:text-primary/80 transition-colors">Forgot password?</Link>
                          </div>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-12" {...field} />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-all duration-300" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>
                      )}
                    </Button>
                  </form>
                </Form>
            </div>
            
            <div className="text-center text-sm text-gray-400 [transform:translateZ(10px)]">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-white font-medium hover:underline underline-offset-4">
                Sign up for access
              </Link>
            </div>
          </div>
        </TiltCard>
      </div>
    </div>
  );
}
