"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, Sprout } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

type OnboardingData = {
  locationState: string;
  locationDistrict: string;
  phone: string;
  farmSizeAcres: string;
  primaryCrops: string[];
  irrigationType: string;
  farmingExperienceYears: string;
  goals: string[];
  preferredLanguage: string;
};

const EMPTY: OnboardingData = {
  locationState: "",
  locationDistrict: "",
  phone: "",
  farmSizeAcres: "",
  primaryCrops: [],
  irrigationType: "",
  farmingExperienceYears: "",
  goals: [],
  preferredLanguage: "en",
};

const CROP_OPTIONS = ["Wheat", "Rice", "Cotton", "Sugarcane", "Maize", "Pulses", "Vegetables", "Fruits"];
const GOAL_OPTIONS = [
  "Increase yield",
  "Reduce water usage",
  "Detect crop stress early",
  "Plan irrigation schedules",
  "Track field health over time",
];
const IRRIGATION_OPTIONS = ["Rain-fed", "Canal", "Borewell / tube well", "Drip", "Sprinkler"];

const STEPS = ["Location", "Farm details", "Experience & goals", "Review"];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/onboarding");
        if (res.status === 401) {
          router.push("/login?next=/onboarding");
          return;
        }
        const json = await res.json();
        if (json.completed) {
          router.push("/settings");
          return;
        }
        if (json.profile) {
          setData({
            locationState: json.profile.locationState || "",
            locationDistrict: json.profile.locationDistrict || "",
            phone: json.profile.phone || "",
            farmSizeAcres: json.profile.farmSizeAcres?.toString() || "",
            primaryCrops: json.profile.primaryCrops || [],
            irrigationType: json.profile.irrigationType || "",
            farmingExperienceYears: json.profile.farmingExperienceYears?.toString() || "",
            goals: json.profile.goals || [],
            preferredLanguage: json.profile.preferredLanguage || "en",
          });
        }
        setStep(Math.min(json.step ?? 0, STEPS.length - 1));
      } catch {
        // Non-fatal: user just starts from a blank form.
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const progressPct = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  function validateStep(): boolean {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (!data.locationState.trim()) next.locationState = "State is required";
      if (!data.locationDistrict.trim()) next.locationDistrict = "District is required";
    }
    if (step === 1) {
      if (!data.farmSizeAcres || Number(data.farmSizeAcres) <= 0) next.farmSizeAcres = "Enter a valid farm size";
      if (data.primaryCrops.length === 0) next.primaryCrops = "Select at least one crop";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function persist(complete: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step,
          complete,
          data: {
            ...data,
            farmSizeAcres: data.farmSizeAcres ? Number(data.farmSizeAcres) : undefined,
            farmingExperienceYears: data.farmingExperienceYears
              ? Number(data.farmingExperienceYears)
              : undefined,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to save your progress");
      return true;
    } catch (err: any) {
      toast({ title: "Couldn't save", description: err.message, variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    if (!validateStep()) return;
    const ok = await persist(false);
    if (!ok) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleComplete() {
    const ok = await persist(true);
    if (!ok) return;
    toast({ title: "You're all set", description: "Welcome to EarthInsights AgriSense." });
    router.push("/dashboard");
    router.refresh();
  }

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="flex items-center gap-2 justify-center text-primary">
          <Sprout className="h-6 w-6" />
          <span className="font-bold text-lg">EarthInsights AgriSense</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <Progress value={progressPct} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 && "Where is your farm located?"}
              {step === 1 && "Tell us about your fields so we can tailor advisories."}
              {step === 2 && "A bit about your experience and what you want to achieve."}
              {step === 3 && "Review your details before finishing setup."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={data.locationState}
                      onChange={(e) => setData({ ...data, locationState: e.target.value })}
                    />
                    {errors.locationState && <p className="text-sm text-destructive">{errors.locationState}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="district">District *</Label>
                    <Input
                      id="district"
                      value={data.locationDistrict}
                      onChange={(e) => setData({ ...data, locationDistrict: e.target.value })}
                    />
                    {errors.locationDistrict && (
                      <p className="text-sm text-destructive">{errors.locationDistrict}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={data.phone}
                    onChange={(e) => setData({ ...data, phone: e.target.value })}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="farmSize">Farm size (acres) *</Label>
                  <Input
                    id="farmSize"
                    type="number"
                    min="0"
                    step="0.1"
                    value={data.farmSizeAcres}
                    onChange={(e) => setData({ ...data, farmSizeAcres: e.target.value })}
                  />
                  {errors.farmSizeAcres && <p className="text-sm text-destructive">{errors.farmSizeAcres}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Primary crops *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CROP_OPTIONS.map((crop) => (
                      <label key={crop} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={data.primaryCrops.includes(crop)}
                          onCheckedChange={() =>
                            setData({ ...data, primaryCrops: toggle(data.primaryCrops, crop) })
                          }
                        />
                        {crop}
                      </label>
                    ))}
                  </div>
                  {errors.primaryCrops && <p className="text-sm text-destructive">{errors.primaryCrops}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="irrigation">Irrigation type</Label>
                  <select
                    id="irrigation"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={data.irrigationType}
                    onChange={(e) => setData({ ...data, irrigationType: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {IRRIGATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="experience">Years of farming experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    value={data.farmingExperienceYears}
                    onChange={(e) => setData({ ...data, farmingExperienceYears: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>What do you want to achieve?</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {GOAL_OPTIONS.map((goal) => (
                      <label key={goal} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={data.goals.includes(goal)}
                          onCheckedChange={() => setData({ ...data, goals: toggle(data.goals, goal) })}
                        />
                        {goal}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <div className="space-y-3 text-sm">
                <ReviewRow label="Location" value={`${data.locationDistrict}, ${data.locationState}`} />
                <ReviewRow label="Farm size" value={data.farmSizeAcres ? `${data.farmSizeAcres} acres` : "—"} />
                <ReviewRow label="Primary crops" value={data.primaryCrops.join(", ") || "—"} />
                <ReviewRow label="Irrigation" value={data.irrigationType || "—"} />
                <ReviewRow label="Experience" value={data.farmingExperienceYears ? `${data.farmingExperienceYears} years` : "—"} />
                <ReviewRow label="Goals" value={data.goals.join(", ") || "—"} />
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                disabled={step === 0 || saving}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={handleComplete} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Finish setup
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/50 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
