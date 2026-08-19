"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { ContactSheet } from '@/components/contact-sheet';
import { useLanguage } from '@/hooks/use-language';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isContactOpen, setContactOpen] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
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

    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{t('header.title')}</h1>
            <p className="text-sm text-muted-foreground">Create New Password</p>
          </div>

          <Card className="border-border shadow-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Set New Password</CardTitle>
              <CardDescription>
                {success
                  ? 'Your password has been successfully reset'
                  : 'Enter your new account password below'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm space-y-3">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Password Reset Completed!</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You can now log in to {t('header.title')} with your new password.
                  </p>
                  <Button className="w-full mt-2" onClick={() => router.push('/login')}>
                    Proceed to Sign In <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
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
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
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

                  <Button type="submit" className="w-full font-semibold" disabled={loading}>
                    {loading ? 'Updating Password...' : 'Reset Password'}
                  </Button>
                </form>
              )}
            </CardContent>
            <CardFooter className="flex justify-center border-t pt-4">
              <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
                Back to Sign In
              </Link>
            </CardFooter>
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
