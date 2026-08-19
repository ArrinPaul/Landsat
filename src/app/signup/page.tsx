"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Mail, User, ShieldAlert, ArrowRight } from 'lucide-react';
import type { UserRole } from '@/lib/auth';
import { ContactSheet } from '@/components/contact-sheet';
import { useLanguage } from '@/hooks/use-language';

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { t } = useLanguage();
  const [isContactOpen, setContactOpen] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const isAdmin =
        normalizedEmail === 'admin' ||
        normalizedEmail === 'admin@earthinsights.nasa.gov' ||
        normalizedEmail === 'admin@nasa.gov' ||
        normalizedEmail.startsWith('admin@');
      const assignedRole: UserRole = isAdmin ? 'admin' : 'analyst';

      await signUp(email, name, assignedRole);
      if (assignedRole === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create account.');
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
            <h1 className="text-3xl font-bold tracking-tight">Join {t('header.title')}</h1>
            <p className="text-sm text-muted-foreground">Create an account to run satellite analysis and AI insights</p>
          </div>

          <Card className="border-border shadow-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Create Account</CardTitle>
              <CardDescription>Enter your details to set up your workspace</CardDescription>
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
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Dr. Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane.doe@research.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4 pt-2">
                <Button type="submit" className="w-full font-semibold gap-2" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Register'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <div className="text-center text-xs text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/login" className="text-primary font-semibold hover:underline">
                    Sign in
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
