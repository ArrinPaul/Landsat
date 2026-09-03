"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CROP_OPTIONS, GOAL_OPTIONS, IRRIGATION_OPTIONS } from "@/lib/farm-options";

type FormState = {
  phone: string;
  locationState: string;
  locationDistrict: string;
  farmSizeAcres: string;
  primaryCrops: string[];
  farmingExperienceYears: string;
  irrigationType: string;
  goals: string[];
};

const EMPTY: FormState = {
  phone: "",
  locationState: "",
  locationDistrict: "",
  farmSizeAcres: "",
  primaryCrops: [],
  farmingExperienceYears: "",
  irrigationType: "",
  goals: [],
};

export function ProfileForm() {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const json = await res.json();
        if (json.profile) {
          setForm({
            phone: json.profile.phone || "",
            locationState: json.profile.locationState || "",
            locationDistrict: json.profile.locationDistrict || "",
            farmSizeAcres: json.profile.farmSizeAcres?.toString() || "",
            primaryCrops: json.profile.primaryCrops || [],
            farmingExperienceYears: json.profile.farmingExperienceYears?.toString() || "",
            irrigationType: json.profile.irrigationType || "",
            goals: json.profile.goals || [],
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.locationState.trim()) next.locationState = "State is required";
    if (!form.locationDistrict.trim()) next.locationDistrict = "District is required";
    if (form.farmSizeAcres && Number(form.farmSizeAcres) <= 0) next.farmSizeAcres = "Must be a positive number";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          farmSizeAcres: form.farmSizeAcres ? Number(form.farmSizeAcres) : undefined,
          farmingExperienceYears: form.farmingExperienceYears
            ? Number(form.farmingExperienceYears)
            : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save changes");
      }
      setDirty(false);
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch (err: any) {
      toast({ title: "Couldn't save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="p-state">State *</Label>
          <Input id="p-state" value={form.locationState} onChange={(e) => update("locationState", e.target.value)} />
          {errors.locationState && <p className="text-sm text-destructive">{errors.locationState}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-district">District *</Label>
          <Input
            id="p-district"
            value={form.locationDistrict}
            onChange={(e) => update("locationDistrict", e.target.value)}
          />
          {errors.locationDistrict && <p className="text-sm text-destructive">{errors.locationDistrict}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="p-phone">Phone</Label>
        <Input id="p-phone" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="p-farmsize">Farm size (acres)</Label>
        <Input
          id="p-farmsize"
          type="number"
          min="0"
          step="0.1"
          value={form.farmSizeAcres}
          onChange={(e) => update("farmSizeAcres", e.target.value)}
        />
        {errors.farmSizeAcres && <p className="text-sm text-destructive">{errors.farmSizeAcres}</p>}
      </div>

      <div className="space-y-2">
        <Label>Primary crops</Label>
        <div className="grid grid-cols-2 gap-2">
          {CROP_OPTIONS.map((crop) => (
            <label key={crop} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.primaryCrops.includes(crop)}
                onCheckedChange={() => update("primaryCrops", toggle(form.primaryCrops, crop))}
              />
              {crop}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="p-irrigation">Irrigation type</Label>
        <select
          id="p-irrigation"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.irrigationType}
          onChange={(e) => update("irrigationType", e.target.value)}
        >
          <option value="">Select...</option>
          {IRRIGATION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="p-experience">Years of farming experience</Label>
        <Input
          id="p-experience"
          type="number"
          min="0"
          value={form.farmingExperienceYears}
          onChange={(e) => update("farmingExperienceYears", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Goals</Label>
        <div className="grid grid-cols-1 gap-2">
          {GOAL_OPTIONS.map((goal) => (
            <label key={goal} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.goals.includes(goal)}
                onCheckedChange={() => update("goals", toggle(form.goals, goal))}
              />
              {goal}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving || !dirty}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
