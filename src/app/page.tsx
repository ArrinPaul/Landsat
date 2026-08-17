"use client";

import Link from "next/link";
import React, { useState } from "react";
import {
  Cpu,
  BarChart,
  Download,
  SlidersHorizontal,
  CheckCircle,
  ArrowRight,
  BrainCircuit,
  Sparkles,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { ContactSheet } from "@/components/contact-sheet";
import { useLanguage } from "@/hooks/use-language";
import { Chatbot } from "@/components/chatbot";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  const { t } = useLanguage();
  const [isContactOpen, setContactOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"ndvi" | "ndwi" | "ndbi" | "nbr">("ndvi");

  const indexDetails = {
    ndvi: {
      name: "NDVI (Vegetation Index)",
      formula: "(NIR - Red) / (NIR + Red)",
      desc: "Monitors photosynthetic activity and vegetation health across agricultural plots and forests.",
      badge: "Agricultural Health",
      color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-500"
    },
    ndwi: {
      name: "NDWI (Water Index)",
      formula: "(Green - NIR) / (Green + NIR)",
      desc: "Detects surface water bodies, monitors reservoir depletion, and assesses flood extents.",
      badge: "Hydrology & Moisture",
      color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400"
    },
    ndbi: {
      name: "NDBI (Built-up Index)",
      formula: "(SWIR - NIR) / (SWIR + NIR)",
      desc: "Tracks urban expansion, infrastructure density, and human settlement footprint.",
      badge: "Urbanization",
      color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-500"
    },
    nbr: {
      name: "NBR (Burn Ratio)",
      formula: "(NIR - SWIR2) / (NIR + SWIR2)",
      desc: "Evaluates wildfire burn severity and vegetation recovery progress post-fire.",
      badge: "Wildfire Severity",
      color: "from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-500"
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary selection:text-primary-foreground">
      <Header />
      <main className="flex-1 overflow-hidden">
        {/* Modern Hero Section with Subtle Micro-Animations */}
        <section className="relative w-full min-h-[88vh] flex items-center justify-center text-center text-white overflow-hidden py-16">
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/70" />
          
          {/* Animated Decorative Ambient Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="container px-4 md:px-6 z-10 space-y-8">
            {/* Pill Header Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15 text-emerald-300 text-xs font-semibold uppercase tracking-wider animate-bounce">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Powered by NASA Landsat & Gemini AI</span>
            </div>

            <div className="space-y-4 max-w-4xl mx-auto">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                Satellite Intelligence for <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Earth & Agriculture</span>
              </h1>
              <p className="max-w-[760px] mx-auto text-base sm:text-lg md:text-xl text-slate-300 font-light leading-relaxed">
                Transform raw orbital Landsat telemetry into actionable environmental analytics, soil moisture predictions, and AI-driven crop yield advice in seconds.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:scale-[1.02]">
                <Link href="/dashboard" className="gap-2">
                  Launch Interactive Studio <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 border-white/20 hover:bg-white/10 text-white font-medium backdrop-blur transition-all duration-300 hover:scale-[1.02]">
                <Link href="/predict" className="gap-2">
                  <BrainCircuit className="h-5 w-5 text-emerald-400" />
                  Predictive Crop AI
                </Link>
              </Button>
            </div>

            {/* Platform Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-white/10">
              <div className="p-3 text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">30m</p>
                <p className="text-xs text-slate-400 font-medium">Landsat Spatial Resolution</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-teal-400">4 Indices</p>
                <p className="text-xs text-slate-400 font-medium">NDVI, NDWI, NDBI, NBR</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-cyan-400">Open-Meteo</p>
                <p className="text-xs text-slate-400 font-medium">Real-time Weather Sync</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">&lt; 2.0s</p>
                <p className="text-xs text-slate-400 font-medium">Compute Pipeline Latency</p>
              </div>
            </div>
          </div>
        </section>

        {/* Satellite Indices Interactive Deep Dive Section */}
        <section className="w-full py-16 md:py-24 bg-muted/40 border-y border-border">
          <div className="container px-4 md:px-6 space-y-12">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                Geospatial Analytics Core
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Multi-Spectral Band Indices
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Click below to explore how Earth Insights isolates specific light wavelengths from Landsat sensors to extract critical environmental indicators.
              </p>
            </div>

            {/* Interactive Index Tabs */}
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-background p-1.5 rounded-xl border border-border">
                {(Object.keys(indexDetails) as Array<keyof typeof indexDetails>).map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                      activeTab === key
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {key.toUpperCase()}
                  </button>
                ))}
              </div>

              <Card className={`border shadow-lg bg-gradient-to-br ${indexDetails[activeTab].color}`}>
                <CardContent className="p-6 sm:p-8 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <h3 className="text-xl sm:text-2xl font-bold">{indexDetails[activeTab].name}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-background/80 backdrop-blur">
                      {indexDetails[activeTab].badge}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-foreground/90 font-medium leading-relaxed">
                    {indexDetails[activeTab].desc}
                  </p>
                  <div className="p-3 rounded-lg bg-background/90 border border-border font-mono text-xs sm:text-sm text-foreground flex items-center justify-between">
                    <span className="text-muted-foreground font-sans text-xs">Mathematical Formula:</span>
                    <span className="font-bold text-primary">{indexDetails[activeTab].formula}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section id="features" className="w-full py-16 md:py-24 bg-background">
          <div className="container px-4 md:px-6 space-y-12">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('landing.features.keyFeatures')}
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {t('landing.features.title')}
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  {t('landing.features.subtitle')}
                </p>
              </div>
            </div>

            <div className="mx-auto grid max-w-5xl items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mx-auto">
                    <SlidersHorizontal className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold">{t('landing.features.coordinateInput')}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('landing.features.coordinateInputDesc')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 w-fit mx-auto">
                    <Cpu className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold">{t('landing.features.metricComputation')}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('landing.features.metricComputationDesc')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 w-fit mx-auto">
                    <BarChart className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold">{t('landing.features.interactiveVisuals')}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('landing.features.interactiveVisualsDesc')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 w-fit mx-auto">
                    <Download className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold">{t('landing.features.exportEasily')}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('landing.features.exportEasilyDesc')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Why Choose Us & Tech Stack Section */}
        <section id="about" className="w-full py-16 md:py-24 bg-muted/30 border-t border-border">
          <div className="container px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 items-center max-w-5xl mx-auto">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
                    {t('landing.whyUs.tag')}
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('landing.whyUs.title')}</h2>
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                    {t('landing.whyUs.subtitle')}
                  </p>
                </div>

                <ul className="space-y-3">
                  {[
                    t('landing.whyUs.point1'),
                    t('landing.whyUs.point2'),
                    t('landing.whyUs.point3'),
                    t('landing.whyUs.point4'),
                  ].map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-background/60 transition-colors">
                      <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm font-medium text-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Technical Architecture Highlight Card */}
              <Card className="border-border shadow-xl bg-background p-6 space-y-6">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Integrated Technology Stack</h3>
                    <p className="text-xs text-muted-foreground">High-performance full-stack geospatial architecture</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border">
                    <p className="text-xs font-bold text-foreground">Google Earth Engine</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Petabyte-scale satellite catalog</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border">
                    <p className="text-xs font-bold text-foreground">Google Genkit & Gemini</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Automated AI environmental summaries</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border">
                    <p className="text-xs font-bold text-foreground">Open-Meteo API</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">High-resolution weather correlation</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border">
                    <p className="text-xs font-bold text-foreground">Next.js 15 & Supabase</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Server Actions & Auth RBAC</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="contact" className="py-6 w-full shrink-0 border-t bg-background">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <nav className="flex gap-4 sm:gap-6">
            <Link
              href="#about"
              className="text-xs hover:underline underline-offset-4 text-muted-foreground"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
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
          <p className="text-xs text-muted-foreground text-center">
            {t('footer.copyright')}
          </p>
          <div className="w-24 hidden sm:block" />
        </div>
      </footer>

      <ContactSheet open={isContactOpen} onOpenChange={setContactOpen} />
      <Chatbot />
    </div>
  );
}
