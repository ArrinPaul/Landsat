"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Mail, ShieldAlert, ArrowRight } from 'lucide-react';
import type { UserRole } from '@/lib/auth';
import { ContactSheet } from '@/components/contact-sheet';
import { useLanguage } from '@/hooks/use-language';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const [isContactOpen, setContactOpen] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both User ID/Email and password.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim().toLowerCase();

      // Detect admin access by credentials
      const isAdmin =
        normalizedEmail === 'admin' ||
        normalizedEmail === 'admin@earthinsights.nasa.gov' ||
        normalizedEmail === 'admin@nasa.gov' ||
        normalizedEmail.startsWith('admin@') ||
        normalizedEmail.startsWith('admin_') ||
        normalizedPassword === 'admin' ||
        normalizedPassword === 'admin123' ||
        normalizedPassword === 'admin@2026';

      const detectedRole: UserRole = isAdmin ? 'admin' : 'analyst';
      await signIn(email, detectedRole);

      if (detectedRole === 'admin') {
        router.push(redirectTo.startsWith('/admin') ? redirectTo : '/admin');
      } else {
        router.push(redirectTo.startsWith('/admin') ? '/dashboard' : redirectTo);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{t('header.title')}</h1>
            <p className="text-sm text-muted-foreground">Sign in to access satellite analytics & AI workflows</p>
          </div>

          <Card className="border-border shadow-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Sign in to your account</CardTitle>
              <CardDescription>Enter your credentials to enter the workspace</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">User ID or Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="text"
                      placeholder="user@nasa.gov or admin"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4 pt-2">
                <Button type="submit" className="w-full font-semibold gap-2" disabled={loading}>
                  {loading ? 'Authenticating...' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <div className="text-center text-xs text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link href="/signup" className="text-primary font-semibold hover:underline">
                    Create an account
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
      <footer id="contact" className="py-6 w-full shrink-0 border-t">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <nav className="flex gap-4 sm:gap-6">
            <Link href="/#about" className="text-xs hover:underline underline-offset-4 text-muted-foreground">
              {t('footer.about')}
            </Link>
            <Link
              href="#contact"
              className="text-xs hover:underline underline-offset-4 text-muted-foreground"
              onClick={(e) => {
                e.preventDefault();
                setContactOpen(true);
              }}
            >
              {t('footer.contact')}
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground text-center">{t('footer.copyright')}</p>
          <div className="w-24 hidden sm:block" />
        </div>
      </footer>
      <ContactSheet open={isContactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="text-muted-foreground text-sm">Loading...</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
