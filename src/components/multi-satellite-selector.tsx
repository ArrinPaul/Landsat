"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Satellite, CheckCircle2 } from "lucide-react";

export type SatelliteConstellation = "landsat" | "sentinel2" | "sentinel1" | "modis" | "goes";

interface MultiSatelliteSelectorProps {
  selectedConstellation: SatelliteConstellation;
  onSelectConstellation: (constellation: SatelliteConstellation) => void;
}

export function MultiSatelliteSelector({
  selectedConstellation,
  onSelectConstellation,
}: MultiSatelliteSelectorProps) {
  const satellites = [
    {
      id: "landsat" as const,
      name: "NASA Landsat 8/9",
      agency: "NASA / USGS",
      resolution: "30m Spatial Res",
      revisit: "16-day orbit",
      badge: "Historical Baseline",
      color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
      desc: "Petabyte-scale multi-decadal historical imagery for long-term vegetation, water & urban trend analytics.",
    },
    {
      id: "sentinel2" as const,
      name: "ESA Sentinel-2",
      agency: "Copernicus / ESA",
      resolution: "10m High-Res",
      revisit: "5-day orbit",
      badge: "Ultra-Sharp Optical",
      color: "border-blue-500/40 bg-blue-500/10 text-blue-500",
      desc: "10-meter ultra-sharp optical imagery with Red-Edge bands for precision agriculture and crop canopy detail.",
    },
    {
      id: "sentinel1" as const,
      name: "ESA Sentinel-1 (Radar)",
      agency: "Copernicus / ESA",
      resolution: "20m SAR Radar",
      revisit: "6-day orbit",
      badge: "Cloud-Penetrating",
      color: "border-amber-500/40 bg-amber-500/10 text-amber-500",
      desc: "Synthetic Aperture Radar (C-band) that penetrates thick cloud cover and darkness for 24/7 moisture & flood mapping.",
    },
    {
      id: "modis" as const,
      name: "NASA Terra/Aqua (MODIS)",
      agency: "NASA GSFC",
      resolution: "250m Global",
      revisit: "Daily Orbit",
      badge: "Daily Thermal & Wildfire",
      color: "border-rose-500/40 bg-rose-500/10 text-rose-500",
      desc: "High-frequency daily coverage for global sea surface temperature, thermal anomalies, and wildfire detection.",
    },
    {
      id: "goes" as const,
      name: "NOAA GOES-16/18",
      agency: "NOAA / NASA",
      resolution: "1km Geostationary",
      revisit: "10-min Realtime",
      badge: "Realtime Meteorological",
      color: "border-indigo-500/40 bg-indigo-500/10 text-indigo-500",
      desc: "Continuous geostationary weather satellite monitoring storm systems, atmospheric moisture, and cloud dynamics.",
    },
  ];

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Satellite className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">Multi-Satellite Constellation Switcher</CardTitle>
            <CardDescription className="text-xs">
              Select open-source satellite telemetry provider (NASA Landsat, ESA Sentinel-1/2, MODIS, GOES)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {satellites.map((sat) => {
            const isSelected = selectedConstellation === sat.id;
            return (
              <button
                key={sat.id}
                type="button"
                onClick={() => onSelectConstellation(sat.id)}
                className={`p-3 text-left rounded-xl border transition-all flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20 font-semibold shadow-md"
                    : "border-border bg-muted/20 hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{sat.name}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">{sat.agency}</p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${sat.color}`}>
                    {sat.badge}
                  </span>
                  <div className="text-[10px] font-mono text-muted-foreground flex justify-between">
                    <span>{sat.resolution}</span>
                    <span>{sat.revisit}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
