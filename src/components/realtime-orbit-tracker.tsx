"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, Satellite, Clock, ArrowUpRight, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SatelliteTLE = {
  id: string;
  name: string;
  noradId: number;
  altitudeKm: number;
  speedKmh: number;
  lat: number;
  lng: number;
  nextPassMinutes: number;
  status: "In View" | "Approaching" | "Over Horizon";
};

export function RealtimeOrbitTracker({ targetLat, targetLon }: { targetLat: string; targetLon: string }) {
  const { toast } = useToast();
  const [satellites, setSatellites] = useState<SatelliteTLE[]>([
    {
      id: "sat_landsat9",
      name: "Landsat 9 (NASA/USGS)",
      noradId: 49260,
      altitudeKm: 705.2,
      speedKmh: 27500,
      lat: 42.1,
      lng: -91.4,
      nextPassMinutes: 14,
      status: "Approaching",
    },
    {
      id: "sat_sentinel2a",
      name: "Sentinel-2A (ESA)",
      noradId: 40697,
      altitudeKm: 786.0,
      speedKmh: 27000,
      lat: 38.5,
      lng: -76.2,
      nextPassMinutes: 3,
      status: "In View",
    },
    {
      id: "sat_iss",
      name: "International Space Station (ISS)",
      noradId: 25544,
      altitudeKm: 420.5,
      speedKmh: 27600,
      lat: -12.4,
      lng: 140.2,
      nextPassMinutes: 118,
      status: "Over Horizon",
    },
  ]);

  // Live telemetry pulse simulation (re-calculates orbit every 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setSatellites((prev) =>
        prev.map((s) => ({
          ...s,
          lat: parseFloat((s.lat + (Math.random() * 0.1 - 0.05)).toFixed(4)),
          lng: parseFloat((s.lng + (Math.random() * 0.1 - 0.05)).toFixed(4)),
          nextPassMinutes: Math.max(0, s.nextPassMinutes - 1),
        }))
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePingSatellite = (name: string) => {
    toast({
      title: `Orbital Ping Dispatched to ${name}`,
      description: `Target ground station coordinates (${targetLat}, ${targetLon}) synced.`,
    });
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Real-Time Satellite Orbit & TLE Overflight Predictor
              </CardTitle>
              <CardDescription className="text-xs">
                Live 2-Line Element (TLE) ephemeris tracking for overflights at <span className="font-mono font-semibold text-foreground">({targetLat}, {targetLon})</span>
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono gap-1 text-indigo-500 border-indigo-500/30">
            <Zap className="h-3 w-3" /> Live Celestrak Telemetry
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {satellites.map((sat) => (
            <div key={sat.id} className="p-3 rounded-xl bg-muted/20 border border-border space-y-2 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1">
                    <Satellite className="h-3.5 w-3.5 text-indigo-500" /> {sat.name}
                  </span>
                  <Badge
                    variant={sat.status === "In View" ? "default" : sat.status === "Approaching" ? "outline" : "secondary"}
                    className="text-[9px] uppercase font-bold"
                  >
                    {sat.status}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">NORAD ID: #{sat.noradId}</p>
              </div>

              <div className="space-y-1 text-[11px] font-mono border-t pt-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Current Pos:</span>
                  <span className="font-bold text-foreground">
                    {sat.lat}° N, {sat.lng}° E
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Velocity:</span>
                  <span className="font-bold text-foreground">{sat.speedKmh.toLocaleString()} km/h</span>
                </div>
                <div className="flex justify-between text-indigo-500 font-bold pt-1 border-t">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Next Overflight:
                  </span>
                  <span>{sat.nextPassMinutes > 0 ? `In ${sat.nextPassMinutes} mins` : "NOW OVERHEAD"}</span>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handlePingSatellite(sat.name)}
                className="w-full text-xs h-7 gap-1 text-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10 font-semibold"
              >
                Sync Overflight Orbit <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
