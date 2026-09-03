"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Cpu, BarChart, Download, SlidersHorizontal, CheckCircle, ArrowRight, BrainCircuit, Globe2, Activity, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { ContactSheet } from "@/components/contact-sheet";
import { useLanguage } from "@/hooks/use-language";
import { Chatbot } from "@/components/chatbot";
import { TiltCard } from "@/components/tilt-card";

export default function LandingPage() {
    const { t } = useLanguage();
    const [isContactOpen, setContactOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary/20">
      <Header />
      <main className="flex-1">
        <section className="relative w-full h-[80vh] md:h-[90vh] flex items-center justify-center text-center overflow-hidden">
             {/* Dynamic Background */}
             <div className="absolute inset-0 z-0 bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
             
            <div className="container px-4 md:px-6 z-10 animate-in fade-in zoom-in-95 duration-1000 slide-in-from-bottom-8">
              <div className="flex flex-col justify-center space-y-6">
                <div className="space-y-4">
                  <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl/tight text-white drop-shadow-md">
                    {t('landing.hero.title')}
                  </h1>
                  <p className="max-w-[800px] mx-auto text-xl text-gray-300 md:text-2xl font-medium leading-relaxed">
                    {t('landing.hero.subtitle')}
                  </p>
                </div>
                <div className="flex flex-col gap-4 min-[400px]:flex-row justify-center pt-6">
                   <Button asChild size="lg" className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
                    <Link href="/dashboard">{t('landing.hero.getStarted')} <ArrowRight className="ml-2 h-5 w-5" /></Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 px-8 rounded-full bg-white/5 text-white border-white/20 hover:bg-white/10 hover:text-white hover:scale-105 transition-all duration-300 backdrop-blur-sm">
                    <Link href="/predict">{t('landing.hero.predictiveTools')} <BrainCircuit className="ml-2 h-5 w-5" /></Link>
                  </Button>
                </div>
              </div>
            </div>
        </section>

        {/* Global Impact Metrics Banner */}
        <section className="w-full py-12 border-y border-border/50 bg-muted/20 relative z-10">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-border/50">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Globe2 className="h-6 w-6 text-primary mb-2 opacity-80" />
                <h4 className="text-3xl font-bold tracking-tighter">50+</h4>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Global Nodes</p>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2">
                <Activity className="h-6 w-6 text-primary mb-2 opacity-80" />
                <h4 className="text-3xl font-bold tracking-tighter">&lt; 1s</h4>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Real-Time Sync</p>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2">
                <ShieldCheck className="h-6 w-6 text-primary mb-2 opacity-80" />
                <h4 className="text-3xl font-bold tracking-tighter">100%</h4>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Zero-Trust Security</p>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2">
                <BrainCircuit className="h-6 w-6 text-primary mb-2 opacity-80" />
                <h4 className="text-3xl font-bold tracking-tighter">AI</h4>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Neural Engine</p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-16 md:py-24 lg:py-32 bg-background relative">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-3">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {t('landing.features.keyFeatures')}
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  {t('landing.features.title')}
                </h2>
                <p className="max-w-[800px] mx-auto text-muted-foreground md:text-lg/relaxed lg:text-xl/relaxed">
                  {t('landing.features.subtitle')}
                </p>
              </div>
            </div>
            
            <div className="mx-auto grid max-w-6xl items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-16">
              {[
                { icon: SlidersHorizontal, title: 'coordinateInput', desc: 'coordinateInputDesc' },
                { icon: Cpu, title: 'metricComputation', desc: 'metricComputationDesc' },
                { icon: BarChart, title: 'interactiveVisuals', desc: 'interactiveVisualsDesc' },
                { icon: Download, title: 'exportEasily', desc: 'exportEasilyDesc' }
              ].map((feature, i) => (
                <TiltCard key={i}>
                  <div className="group relative flex flex-col items-center text-center p-8 rounded-2xl border border-border/50 bg-card hover:bg-accent/40 hover:border-accent transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 h-full [transform:translateZ(30px)]">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner">
                      <feature.icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight mb-2">{t(`landing.features.${feature.title}`)}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(`landing.features.${feature.desc}`)}
                    </p>
                  </div>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="w-full py-16 md:py-24 lg:py-32 bg-muted/30 relative border-y border-border/50">
          <div className="container px-4 md:px-6 max-w-6xl">
            <div className="text-center mb-16">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                Workflow
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Intelligence Workflow</h2>
              <p className="mt-4 text-muted-foreground md:text-lg/relaxed max-w-[800px] mx-auto">
                How Landsat bridges the gap between ground-level intelligence and institutional medical response.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 relative mt-12">
              {/* Connecting line for desktop */}
              <div className="hidden md:block absolute top-12 left-[10%] w-[80%] h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent -z-10"></div>
              
              <TiltCard>
                <div className="flex flex-col items-center text-center space-y-4 relative bg-background p-6 rounded-2xl border border-border/50 shadow-sm h-full [transform:translateZ(40px)]">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-lg ring-8 ring-muted mb-2 [transform:translateZ(20px)]">1</div>
                  <h3 className="text-2xl font-semibold">Collect</h3>
                  <p className="text-muted-foreground leading-relaxed px-4">Community nodes report anomalies, symptoms, and water quality metrics in real-time securely.</p>
                </div>
              </TiltCard>
              
              <TiltCard>
                <div className="flex flex-col items-center text-center space-y-4 relative bg-background p-6 rounded-2xl border border-border/50 shadow-sm h-full [transform:translateZ(40px)]">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-lg ring-8 ring-muted mb-2 [transform:translateZ(20px)]">2</div>
                  <h3 className="text-2xl font-semibold">Analyze</h3>
                  <p className="text-muted-foreground leading-relaxed px-4">The AI Neural Engine processes the data, identifying trends, outbreaks, and risk factors instantly.</p>
                </div>
              </TiltCard>
              
              <TiltCard>
                <div className="flex flex-col items-center text-center space-y-4 relative bg-background p-6 rounded-2xl border border-border/50 shadow-sm h-full [transform:translateZ(40px)]">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-lg ring-8 ring-muted mb-2 [transform:translateZ(20px)]">3</div>
                  <h3 className="text-2xl font-semibold">Act</h3>
                  <p className="text-muted-foreground leading-relaxed px-4">Verified intelligence is broadcasted to institutional responders to orchestrate a proactive defense.</p>
                </div>
              </TiltCard>
            </div>
          </div>
        </section>

        <section id="about" className="w-full py-16 md:py-24 lg:py-32 bg-background">
            <div className="container px-4 md:px-6 max-w-6xl">
                 <div className="grid gap-12 lg:grid-cols-2 items-center">
                    <div className="space-y-6 lg:text-left text-center">
                        <div className="inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                          {t('landing.whyUs.tag')}
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl leading-tight">
                          {t('landing.whyUs.title')}
                        </h2>
                        <p className="text-muted-foreground md:text-lg/relaxed max-w-2xl mx-auto lg:mx-0">
                            {t('landing.whyUs.subtitle')}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map((point) => (
                          <TiltCard key={point}>
                            <div className="flex flex-col p-6 bg-background rounded-xl border border-border/50 shadow-sm hover:shadow-xl transition-all h-full [transform:translateZ(30px)]">
                                <CheckCircle className="h-8 w-8 text-primary mb-4 [transform:translateZ(10px)]" />
                                <span className="font-semibold text-foreground/90">{t(`landing.whyUs.point${point}`)}</span>
                            </div>
                          </TiltCard>
                        ))}
                    </div>
                 </div>
            </div>
        </section>
      </main>
      
      <footer id="contact" className="py-8 w-full shrink-0 border-t bg-background">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
            <nav className="flex gap-6">
                <Link href="#about" className="text-sm font-medium hover:text-primary transition-colors text-muted-foreground" onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({behavior: 'smooth'})}}>
                  {t('footer.about')}
                </Link>
                <Link href="#contact" className="text-sm font-medium hover:text-primary transition-colors text-muted-foreground" onClick={(e) => { e.preventDefault(); setContactOpen(true)}}>
                  {t('footer.contact')}
                </Link>
            </nav>
            <p className="text-sm text-muted-foreground text-center">
              {t('footer.copyright')}
            </p>
            <div className="w-24 hidden md:block"></div>
        </div>
      </footer>
      
      <ContactSheet open={isContactOpen} onOpenChange={setContactOpen} />
      <Chatbot />
    </div>
  );
}
