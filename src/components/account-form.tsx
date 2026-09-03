"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

type Identity = { name: string; email: string; avatarUrl: string };

export function AccountForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<Identity>({ name: "", email: "", avatarUrl: "" });
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [identityDirty, setIdentityDirty] = useState(false);

  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "" });
  const [savingEmail, setSavingEmail] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const json = await res.json();
        if (json.user) {
          setIdentity({
            name: json.user.name || "",
            email: json.user.email || "",
            avatarUrl: json.profile?.avatarUrl || "",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSaveIdentity() {
    setSavingIdentity(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: identity.name, avatarUrl: identity.avatarUrl || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save changes");
      }
      setIdentityDirty(false);
      toast({ title: "Profile updated", description: "Your name and photo have been saved." });
    } catch (err: any) {
      toast({ title: "Couldn't save", description: err.message, variant: "destructive" });
    } finally {
      setSavingIdentity(false);
    }
  }

  async function handleChangeEmail() {
    setSavingEmail(true);
    try {
      const res = await fetch("/api/profile/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailForm),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to update email");
      setIdentity((prev) => ({ ...prev, email: body.email }));
      setEmailForm({ newEmail: "", currentPassword: "" });
      toast({ title: "Email updated", description: "Your account email has been changed." });
    } catch (err: any) {
      toast({ title: "Couldn't update email", description: err.message, variant: "destructive" });
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleChangePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to update password");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password updated", description: "Use your new password next time you sign in." });
    } catch (err: any) {
      toast({ title: "Couldn't update password", description: err.message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
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
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={identity.avatarUrl || undefined} alt={identity.name} />
            <AvatarFallback>{identity.name.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="acc-avatar">Avatar URL</Label>
            <Input
              id="acc-avatar"
              placeholder="https://example.com/photo.jpg"
              value={identity.avatarUrl}
              onChange={(e) => {
                setIdentity((p) => ({ ...p, avatarUrl: e.target.value }));
                setIdentityDirty(true);
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="acc-name">Full name</Label>
          <Input
            id="acc-name"
            value={identity.name}
            onChange={(e) => {
              setIdentity((p) => ({ ...p, name: e.target.value }));
              setIdentityDirty(true);
            }}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveIdentity} disabled={savingIdentity || !identityDirty}>
            {savingIdentity ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Email address</h3>
          <p className="text-xs text-muted-foreground">Currently signed in as {identity.email}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="acc-new-email">New email</Label>
            <Input
              id="acc-new-email"
              type="email"
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm((p) => ({ ...p, newEmail: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-email-password">Current password</Label>
            <Input
              id="acc-email-password"
              type="password"
              value={emailForm.currentPassword}
              onChange={(e) => setEmailForm((p) => ({ ...p, currentPassword: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={handleChangeEmail}
            disabled={savingEmail || !emailForm.newEmail || !emailForm.currentPassword}
          >
            {savingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update email
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Password
          </h3>
          <p className="text-xs text-muted-foreground">Choose a new password of at least 8 characters.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="acc-current-password">Current password</Label>
            <Input
              id="acc-current-password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-new-password">New password</Label>
            <Input
              id="acc-new-password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-confirm-password">Confirm new password</Label>
            <Input
              id="acc-confirm-password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={handleChangePassword}
            disabled={
              savingPassword ||
              !passwordForm.currentPassword ||
              !passwordForm.newPassword ||
              !passwordForm.confirmPassword
            }
          >
            {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update password
          </Button>
        </div>
      </div>
    </div>
  );
}
