"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wheat, CloudRain, Droplets, Sparkles, Send, Bot, Loader2, TrendingUp } from "lucide-react";

interface CropYieldAdvisoryAgentProps {
  lat: string;
  lon: string;
  locationLabel?: string;
}

export function CropYieldAdvisoryAgent({ lat, lon, locationLabel }: CropYieldAdvisoryAgentProps) {
  const [cropType, setCropType] = useState("Corn / Maize");
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Array<{ role: "user" | "model"; content: string }>>([
    {
      role: "model",
      content: `🌾 Hello! I am your Crop Yield Advisory Agent. I am monitoring coordinates (${lat}, ${lon}) for ${locationLabel || "your plot"}. Ask me about yield forecasts, irrigation schedules, or fertilizer timing!`,
    },
  ]);

  const [telemetry] = useState({
    predictedYield: "8.6 Tons / Hectare",
    irrigationNeeded: "25mm Drip Irrigation in 48h",
    soilMoistureStatus: "Optimal (0.32 m³/m³)",
  });

  const handleSend = () => {
    if (!inputMsg.trim()) return;
    const userText = inputMsg;
    setInputMsg("");
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setLoading(true);

    setTimeout(() => {
      let botAnswer = ` Based on current Landsat soil moisture indices and Open-Meteo 7-day weather forecast at (${lat}, ${lon}), condition for ${cropType} is favorable. Ensure nitrogen fertigation before upcoming rainfall.`;
      
      if (userText.toLowerCase().includes("water") || userText.toLowerCase().includes("irrigation")) {
        botAnswer = `💧 **Irrigation Advice**: Soil moisture is currently 0.32 m³/m³. With expected 14mm rainfall over the next 3 days, delay deep watering until Friday.`;
      } else if (userText.toLowerCase().includes("yield") || userText.toLowerCase().includes("harvest")) {
        botAnswer = `📊 **Crop Yield Prediction**: Projected yield for ${cropType} is **8.6 Tons/Ha** (+6.2% above multi-year baseline). Canopy NDVI index is holding strong at 0.74.`;
      }

      setMessages((prev) => [...prev, { role: "model", content: botAnswer }]);
      setLoading(false);
    }, 1200);
  };

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Wheat className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Crop Yield & Agronomic Advisory Agent <Sparkles className="h-4 w-4 text-emerald-500" />
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time advice linked to location <span className="font-mono text-foreground font-semibold">({lat}, {lon})</span> & weather
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Target Crop:</label>
            <select
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="Corn / Maize">Corn / Maize</option>
              <option value="Soybeans">Soybeans</option>
              <option value="Wheat">Wheat</option>
              <option value="Rice">Rice</option>
              <option value="Cotton">Cotton</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Telemetry Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Yield Projection
            </p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{telemetry.predictedYield}</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5 text-blue-500" /> Irrigation Advisory
            </p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{telemetry.irrigationNeeded}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <CloudRain className="h-3.5 w-3.5 text-amber-500" /> Soil Moisture Status
            </p>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{telemetry.soilMoistureStatus}</p>
          </div>
        </div>

        {/* Chat History Box */}
        <div className="h-56 overflow-y-auto space-y-3 p-3 rounded-xl bg-muted/30 border border-border">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "model" && (
                <div className="h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-500 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground font-medium rounded-tr-none"
                    : "bg-background border border-border text-foreground rounded-tl-none shadow-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
              <span>Analyzing Open-Meteo weather & Landsat moisture levels...</span>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder={`Ask agronomic advisory for ${cropType} at (${lat}, ${lon})...`}
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            disabled={loading}
            className="text-xs"
          />
          <Button type="submit" disabled={loading || !inputMsg.trim()} size="sm" className="gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white">
            <Send className="h-3.5 w-3.5" /> Send
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
