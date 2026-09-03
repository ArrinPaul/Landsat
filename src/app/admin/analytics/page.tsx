"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar, BarChart, Legend } from "recharts";
import { BrainCircuit, CloudRain, ServerCog } from "lucide-react";

// Mock data based on server logs (AI token usage, Open-Meteo calls, etc.)
const tokenUsageData = [
  { date: "Aug 28", tokens: 12400 },
  { date: "Aug 29", tokens: 21000 },
  { date: "Aug 30", tokens: 18500 },
  { date: "Aug 31", tokens: 35000 },
  { date: "Sep 01", tokens: 42000 },
  { date: "Sep 02", tokens: 39500 },
  { date: "Sep 03", tokens: 55000 },
];

const apiCallsData = [
  { date: "Aug 28", openMeteo: 120, soilApi: 45, success: 160, failed: 5 },
  { date: "Aug 29", openMeteo: 150, soilApi: 60, success: 200, failed: 10 },
  { date: "Aug 30", openMeteo: 140, soilApi: 55, success: 190, failed: 5 },
  { date: "Aug 31", openMeteo: 280, soilApi: 90, success: 360, failed: 10 },
  { date: "Sep 01", openMeteo: 310, soilApi: 110, success: 410, failed: 10 },
  { date: "Sep 02", openMeteo: 290, soilApi: 105, success: 380, failed: 15 },
  { date: "Sep 03", openMeteo: 420, soilApi: 150, success: 550, failed: 20 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Analytics</h1>
        <p className="text-muted-foreground text-sm">Monitor AI token usage and external API performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Token Usage</CardTitle>
            <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">31,914</div>
            <p className="text-xs text-muted-foreground">+14% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open-Meteo Calls</CardTitle>
            <CloudRain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,710</div>
            <p className="text-xs text-muted-foreground">+32% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Error Rate</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2%</div>
            <p className="text-xs text-muted-foreground">Historical weather fetch fails</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Analysis Jobs</CardTitle>
            <ServerCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">Currently in queue</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>AI Token Usage (Groq/Gemini)</CardTitle>
            <CardDescription>Daily tokens consumed by crop yield and metrics predictions.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tokenUsageData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <Tooltip />
                <Area type="monotone" dataKey="tokens" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorTokens)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>External API Calls</CardTitle>
            <CardDescription>Success vs failure rates for Open-Meteo & Soil API.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={apiCallsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <Tooltip />
                <Legend />
                <Bar dataKey="success" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} name="Successful Calls" />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed Calls" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AlertTriangleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
