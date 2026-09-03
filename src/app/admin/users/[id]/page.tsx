"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type Detail = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    onboarding_completed: boolean;
    onboarding_step: number;
    disabled: boolean;
    created_at: string;
    last_login_at: string | null;
  };
  profile: {
    locationState: string | null;
    locationDistrict: string | null;
    phone: string | null;
    farmSizeAcres: number | null;
    primaryCrops: string[];
    irrigationType: string | null;
    farmingExperienceYears: number | null;
    goals: string[];
  } | null;
  events: { id: string; event_type: string; created_at: string; metadata: Record<string, unknown> }[];
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${params.id}`);
    if (res.ok) {
      setDetail(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function updateUser(patch: { role?: string; disabled?: boolean }) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Update failed");
      toast({ title: "Account updated" });
      await load();
    } catch (err: any) {
      toast({ title: "Couldn't update user", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-muted-foreground">User not found.</p>;
  }

  const { user, profile, events } = detail;

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => router.push("/admin/users")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to users
      </Button>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
          {user.disabled ? (
            <Badge variant="destructive">Disabled</Badge>
          ) : (
            <Badge variant="secondary">Active</Badge>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Registration and access metadata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Registered" value={new Date(user.created_at).toLocaleString()} />
            <Row
              label="Last login"
              value={user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Never"}
            />
            <Row label="Onboarding" value={user.onboarding_completed ? "Complete" : `In progress (step ${user.onboarding_step})`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Information collected during onboarding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {profile ? (
              <>
                <Row label="Location" value={[profile.locationDistrict, profile.locationState].filter(Boolean).join(", ") || "—"} />
                <Row label="Phone" value={profile.phone || "—"} />
                <Row label="Farm size" value={profile.farmSizeAcres ? `${profile.farmSizeAcres} acres` : "—"} />
                <Row label="Crops" value={profile.primaryCrops.join(", ") || "—"} />
                <Row label="Irrigation" value={profile.irrigationType || "—"} />
                <Row label="Experience" value={profile.farmingExperienceYears ? `${profile.farmingExperienceYears} years` : "—"} />
                <Row label="Goals" value={profile.goals.join(", ") || "—"} />
              </>
            ) : (
              <p className="text-muted-foreground">No profile data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Administrative actions</CardTitle>
            <CardDescription>Changes are audited and enforced server-side.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <Select value={user.role} onValueChange={(v) => updateUser({ role: v })} disabled={updating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant={user.disabled ? "default" : "destructive"}
              disabled={updating}
              onClick={() => updateUser({ disabled: !user.disabled })}
              className="w-full"
            >
              {user.disabled ? (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Re-enable account
                </>
              ) : (
                <>
                  <ShieldAlert className="mr-2 h-4 w-4" /> Disable account
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Recent account events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm max-h-72 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-muted-foreground">No recorded activity yet.</p>
            ) : (
              events.map((e) => (
                <div key={e.id} className="flex justify-between border-b border-border/50 pb-2">
                  <span>{e.event_type.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
