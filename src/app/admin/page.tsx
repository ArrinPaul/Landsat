"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, UserX, ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

type Stats = {
  totalUsers: number;
  onboardedUsers: number;
  incompleteOnboarding: number;
  onboardingCompletionRate: number;
  adminCount: number;
  newLast7Days: number;
  registrationsByDay: { date: string; count: number }[];
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load dashboard stats");
        return res.json();
      })
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          {error || "No data available."}
        </CardContent>
      </Card>
    );
  }

  const cards = [
    { label: "Total users", value: stats.totalUsers, icon: Users },
    { label: "New in last 7 days", value: stats.newLast7Days, icon: UserCheck },
    { label: "Incomplete onboarding", value: stats.incompleteOnboarding, icon: UserX },
    { label: "Admins", value: stats.adminCount, icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">Operational snapshot of accounts and onboarding.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-3xl font-bold tracking-tight">{value}</p>
                </div>
                <Icon className="h-8 w-8 text-primary opacity-70" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding completion</CardTitle>
          <CardDescription>
            {stats.onboardedUsers} of {stats.totalUsers} users ({stats.onboardingCompletionRate}%) have finished
            onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${stats.onboardingCompletionRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrations (last 30 days)</CardTitle>
          <CardDescription>New accounts created per day.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.registrationsByDay.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No registrations in this window yet.
            </p>
          ) : (
            <ChartContainer config={{ count: { label: "Registrations", color: "hsl(var(--primary))" } }} className="h-64 w-full">
              <LineChart data={stats.registrationsByDay}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.slice(5)}
                  fontSize={12}
                />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={12} width={24} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
