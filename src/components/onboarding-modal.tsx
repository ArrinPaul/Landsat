"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Globe, Layers, BrainCircuit, ArrowRight, CheckCircle2 } from "lucide-react";

const ONBOARDING_COMPLETED_KEY = "earth_insights_onboarding_completed";

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
    if (!completed) {
      setOpen(true);
    }
  }, []);

  const handleFinish = () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
    setOpen(false);
  };

  const steps = [
    {
      title: "Welcome to Earth Insights!",
      subtitle: "NASA Landsat Geospatial & AI Platform",
      icon: Globe,
      color: "text-emerald-500 bg-emerald-500/10",
      content:
        "Earth Insights processes satellite telemetry from NASA Landsat 8/9 to deliver actionable insights on land health, water depletion, deforestation, and urban growth.",
    },
    {
      title: "Interactive Custom ROI & Polygon Drawing",
      subtitle: "Pinpoint regions of interest on the globe",
      icon: Layers,
      color: "text-blue-500 bg-blue-500/10",
      content:
        "Use the new Custom ROI Polygon Drawer to set target land boundaries, or switch layer modes between True Color (RGB), False Color (IR), NDVI Heatmaps, and NDWI Water layers.",
    },
    {
      title: "AI-Powered Crop Yield & Anomaly Alerts",
      subtitle: "Predictive intelligence powered by Genkit & Gemini AI",
      icon: BrainCircuit,
      color: "text-purple-500 bg-purple-500/10",
      content:
        "Run multi-year temporal anomaly detectors to compare land changes across years and receive AI-generated crop yield advice correlated with Open-Meteo weather data.",
    },
  ];

  const currentStep = steps[step - 1];
  const Icon = currentStep.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md border-border shadow-2xl">
        <DialogHeader className="text-center space-y-3 pt-4">
          <div className={`p-4 rounded-2xl w-fit mx-auto ${currentStep.color}`}>
            <Icon className="h-10 w-10 animate-pulse" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold">{currentStep.title}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {currentStep.subtitle}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="py-3 px-2 text-center text-sm text-foreground/90 leading-relaxed bg-muted/30 rounded-xl border border-border">
          {currentStep.content}
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center items-center gap-1.5 py-2">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === idx + 1 ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between items-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFinish}
            className="text-xs text-muted-foreground"
          >
            Skip Tutorial
          </Button>

          {step < steps.length ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)} className="gap-1 font-semibold text-xs">
              Next <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleFinish} className="gap-1 font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
              Get Started <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
