"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { ContactSheet } from '@/components/contact-sheet';
import { useLanguage } from '@/hooks/use-language';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { t } = useLanguage();
  const [isContactOpen, setContactOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{t('header.title')}</h1>
            <p className="text-sm text-muted-foreground">Account Recovery</p>
          </div>

          <Card className="border-border shadow-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Reset Password</CardTitle>
              <CardDescription>
                {submitted
                  ? 'Check your inbox for password reset instructions'
                  : 'Enter your account email to receive a password reset link'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Reset Link Sent!</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We sent a recovery email to <span className="font-semibold text-foreground">{email}</span>. Follow the instructions in the email to set up your new password.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="analyst@nasa.gov"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full font-semibold">
                    Send Recovery Link
                  </Button>
                </form>
              )}
            </CardContent>
            <CardFooter className="flex justify-center border-t pt-4">
              <Link href="/login" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground gap-1">
                <ArrowLeft className="h-3 w-3" />
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
