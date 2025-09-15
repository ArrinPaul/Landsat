
"use client";

import React from 'react';
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, CreditCard, Lock } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from '@/hooks/use-toast';

export default function PaymentPage() {
    const { t } = useLanguage();
    const { toast } = useToast();

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // This is a mock submission.
        toast({
            title: "Payment Successful (Mock)",
            description: "Your Pro plan has been activated. Thank you!",
        });
        // In a real app, you'd redirect to a confirmation page or the dashboard.
    };

    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <Header />
            <main className="flex-1 py-12 md:py-24">
                <div className="container grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 md:px-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('payment.title')}</CardTitle>
                                <CardDescription>{t('payment.description')}</CardDescription>
                            </CardHeader>
                            <form onSubmit={handlePaymentSubmit}>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="cardNumber">{t('payment.cardNumber')}</Label>
                                        <div className="relative">
                                            <Input id="cardNumber" placeholder="0000 0000 0000 0000" required />
                                            <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="expiryDate">{t('payment.expiryDate')}</Label>
                                            <Input id="expiryDate" placeholder="MM / YY" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cvc">{t('payment.cvc')}</Label>
                                            <Input id="cvc" placeholder="CVC" required />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nameOnCard">{t('payment.nameOnCard')}</Label>
                                        <Input id="nameOnCard" placeholder={t('payment.nameOnCardPlaceholder')} required />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" className="w-full">
                                        <Lock className="mr-2 h-4 w-4" />
                                        {t('payment.payButton', { amount: '$20' })}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                    <div className="lg:col-span-1">
                        <Card className="sticky top-24">
                            <CardHeader>
                                <CardTitle>{t('payment.summary.title')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span>{t('payment.summary.plan')}</span>
                                    <span className="font-semibold">Pro Plan</span>
                                </div>
                                <div className="flex justify-between items-center font-bold text-lg">
                                    <span>{t('payment.summary.total')}</span>
                                    <span>$20.00</span>
                                </div>
                                <ul className="space-y-2 text-sm text-muted-foreground pt-4 border-t">
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited metric computations</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> All Predictive Tools</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Advanced AI Insights</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
