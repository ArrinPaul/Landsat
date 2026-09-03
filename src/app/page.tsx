"use client";

import Link from "next/link";
import React from "react";
import { Cpu, BarChart, Download, SlidersHorizontal, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useLanguage } from "@/hooks/use-language";
import { Chatbot } from "@/components/chatbot";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LandingPage() {
    const { t } = useLanguage();

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-x-hidden w-full">
      <Header />
      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative w-full py-20 md:py-32 lg:py-48 flex items-center justify-center text-center bg-muted/20 overflow-hidden">
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
            
            <div className="container relative z-10 px-4 md:px-6">
              <div className="flex flex-col justify-center items-center space-y-8">
                
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary">
                    <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                    Earth Insights v2.0 is Live
                </div>

                <div className="space-y-4 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl xl:text-6xl text-foreground">
                    {t('landing.hero.title')}
                  </h1>
                  <p className="max-w-[700px] mx-auto text-lg text-muted-foreground md:text-xl leading-relaxed">
                    {t('landing.hero.subtitle')}
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-150 fill-mode-both">
                   <Button asChild size="lg" className="px-8 text-base shadow-lg hover:shadow-primary/25 transition-all">
                    <Link href="/dashboard">
                        {t('landing.hero.getStarted')} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="px-8 text-base">
                    <Link href="#features">
                        Learn More
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="w-full py-16 md:py-24 lg:py-32 bg-background border-t">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm font-medium">
                  {t('landing.features.keyFeatures')}
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  {t('landing.features.title')}
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-lg">
                  {t('landing.features.subtitle')}
                </p>
            </div>
            
            <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Feature 1 */}
              <Card className="border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-primary/50 group">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-primary/10 text-primary p-3 rounded-lg mb-4 w-fit group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        <SlidersHorizontal className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{t('landing.features.coordinateInput')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <CardDescription className="text-sm">
                        {t('landing.features.coordinateInputDesc')}
                    </CardDescription>
                </CardContent>
              </Card>
              
              {/* Feature 2 */}
              <Card className="border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-primary/50 group">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-primary/10 text-primary p-3 rounded-lg mb-4 w-fit group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        <Cpu className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{t('landing.features.metricComputation')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <CardDescription className="text-sm">
                    {t('landing.features.metricComputationDesc')}
                    </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-primary/50 group">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-primary/10 text-primary p-3 rounded-lg mb-4 w-fit group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        <BarChart className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{t('landing.features.interactiveVisuals')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <CardDescription className="text-sm">
                    {t('landing.features.interactiveVisualsDesc')}
                    </CardDescription>
                </CardContent>
              </Card>
              
              {/* Feature 4 */}
              <Card className="border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-primary/50 group">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-primary/10 text-primary p-3 rounded-lg mb-4 w-fit group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        <Download className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{t('landing.features.exportEasily')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <CardDescription className="text-sm">
                    {t('landing.features.exportEasilyDesc')}
                    </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ABOUT / WHY US SECTION */}
        <section id="about" className="w-full py-16 md:py-24 lg:py-32 bg-muted/30 border-t">
            <div className="container px-4 md:px-6">
                 <div className="grid gap-12 lg:grid-cols-2 items-center max-w-6xl mx-auto">
                    <div className="space-y-6">
                        <div className="inline-block rounded-lg bg-background border px-3 py-1 text-sm font-medium">
                            {t('landing.whyUs.tag')}
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                            {t('landing.whyUs.title')}
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            {t('landing.whyUs.subtitle')}
                        </p>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="bg-background border rounded-xl p-8 shadow-sm hover:border-primary/50 transition-colors">
                            <ul className="grid grid-cols-1 gap-6">
                                {[
                                    { text: t('landing.whyUs.point1') },
                                    { text: t('landing.whyUs.point2') },
                                    { text: t('landing.whyUs.point3') },
                                    { text: t('landing.whyUs.point4') },
                                ].map((point, i) => (
                                    <li key={i} className="flex items-start">
                                        <CheckCircle className="h-6 w-6 mr-4 text-primary flex-shrink-0 mt-0.5" />
                                        <span className="text-foreground font-medium">{point.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                            <div className="flex flex-col space-y-1">
                                <span className="text-3xl font-bold text-primary">50+</span>
                                <span className="text-sm text-muted-foreground font-medium">Satellites</span>
                            </div>
                            <div className="flex flex-col space-y-1">
                                <span className="text-3xl font-bold text-primary">99%</span>
                                <span className="text-sm text-muted-foreground font-medium">Uptime</span>
                            </div>
                            <div className="flex flex-col space-y-1">
                                <span className="text-3xl font-bold text-primary">Global</span>
                                <span className="text-sm text-muted-foreground font-medium">Coverage</span>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
        </section>
        
        {/* CTA SECTION */}
        <section className="w-full py-16 md:py-24 bg-background border-t">
             <div className="container px-4 md:px-6 text-center max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Ready to get started?</h2>
                <p className="text-lg text-muted-foreground mb-8">Join the platform to unlock powerful environmental insights today.</p>
                <Button asChild size="lg" className="px-8">
                    <Link href="/dashboard">Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
             </div>
        </section>

      </main>
      <Footer />
      <Chatbot />
    </div>
  );
}
