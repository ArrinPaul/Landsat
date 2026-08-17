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
import { Globe, Layers, ArrowRight, CheckCircle2, Building, Target, MapPin } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const ONBOARDING_COMPLETED_KEY = "earth_insights_onboarding_completed";

export function OnboardingModal() {
  const { updatePreferences } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Form states for user personalization
  const [primaryGoal, setPrimaryGoal] = useState<
    'Agriculture & Crop Yield' | 'Water Resource Monitoring' | 'Urban Planning & Development' | 'Wildfire & Disaster Recovery'
  >('Agriculture & Crop Yield');
  const [orgType, setOrgType] = useState<
    'Government / NASA' | 'Agricultural Enterprise' | 'Academic / Research Institute' | 'Independent Consultant'
  >('Agricultural Enterprise');
  const [favRegion, setFavRegion] = useState('Central Valley, California (36.7783, -119.4179)');
  const [defaultIndex, setDefaultIndex] = useState<'NDVI' | 'NDWI' | 'NDBI' | 'NBR'>('NDVI');

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
    if (!completed) {
      setOpen(true);
    }
  }, []);

  const handleFinish = () => {
    // Save personalized answers to Auth Context & localStorage
    updatePreferences({
      primaryGoal,
      organizationType: orgType,
      favoriteRegion: favRegion,
      defaultIndex,
    });
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg border-border shadow-2xl">
        <DialogHeader className="text-center space-y-2 pt-2">
          <div className="p-3 rounded-2xl w-fit mx-auto bg-primary/10 text-primary">
            <Globe className="h-8 w-8 text-emerald-500 animate-pulse" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold">Personalize Your Earth Insights Studio</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Step {step} of 3: Answer a few quick questions to customize your workspace
            </DialogDescription>
          </div>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-emerald-500" /> What is your primary objective?
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  'Agriculture & Crop Yield',
                  'Water Resource Monitoring',
                  'Urban Planning & Development',
                  'Wildfire & Disaster Recovery',
                ].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setPrimaryGoal(g as any)}
                    className={`p-3 text-xs text-left font-medium rounded-xl border transition-all ${
                      primaryGoal === g
                        ? 'border-emerald-500 bg-emerald-500/10 text-foreground font-semibold shadow-sm'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-blue-500" /> Organization Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Government / NASA',
                  'Agricultural Enterprise',
                  'Academic / Research Institute',
                  'Independent Consultant',
                ].map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOrgType(o as any)}
                    className={`p-3 text-xs text-center font-medium rounded-xl border transition-all ${
                      orgType === o
                        ? 'border-blue-500 bg-blue-500/10 text-foreground font-semibold shadow-sm'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-purple-500" /> Preferred Default Satellite Index
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['NDVI', 'NDWI', 'NDBI', 'NBR'] as const).map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDefaultIndex(idx)}
                    className={`p-2.5 text-xs text-center font-bold rounded-lg border transition-all ${
                      defaultIndex === idx
                        ? 'border-purple-500 bg-purple-500/10 text-purple-500 shadow-sm'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {idx}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-rose-500" /> Primary Region of Interest (ROI)
              </label>
              <input
                type="text"
                value={favRegion}
                onChange={(e) => setFavRegion(e.target.value)}
                placeholder="e.g. Central Valley, California or Iowa Corn Belt"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Customized Context Ready!
              </p>
              <p className="text-[11px] text-muted-foreground">
                Your preference profile will automatically calibrate your dashboard, AI crop assistant, and satellite index defaults every time you log in.
              </p>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex justify-center items-center gap-1.5 py-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === s ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
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
            Skip & Use Defaults
          </Button>

          {step < 3 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)} className="gap-1 font-semibold text-xs">
              Next Step <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleFinish} className="gap-1 font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
              Save & Launch Studio <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
