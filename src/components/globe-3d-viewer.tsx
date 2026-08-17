"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Eye, RotateCw, Sparkles, Box } from "lucide-react";

interface Globe3DViewerProps {
  lat: string;
  lon: string;
  locationLabel: string;
}

export function Globe3DViewer({ lat, lon, locationLabel }: Globe3DViewerProps) {
  const [rotating, setRotating] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(3);

  const latitudeNum = parseFloat(lat) || 40.7128;
  const longitudeNum = parseFloat(lon) || -74.0060;

  return (
    <Card className="border-border shadow-md overflow-hidden">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Globe className="h-6 w-6 animate-spin-slow" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                3D Interactive Digital Twin Earth Globe <Sparkles className="h-4 w-4 text-emerald-400" />
              </CardTitle>
              <CardDescription className="text-xs text-slate-300">
                Spatial 3D projection centered on <span className="font-mono text-emerald-400 font-bold">{locationLabel} ({lat}, {lon})</span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRotating(!rotating)}
              className="h-8 text-xs gap-1 border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
            >
              <RotateCw className="h-3 w-3" /> {rotating ? "Pause Spin" : "Auto Spin"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setWireframe(!wireframe)}
              className="h-8 text-xs gap-1 border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
            >
              <Box className="h-3 w-3" /> {wireframe ? "Solid Map" : "3D Mesh"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        {/* Simulated WebGL 3D Globe Projection Viewport */}
        <div className="relative w-full h-80 bg-slate-950 flex items-center justify-center overflow-hidden">
          {/* Stars & Ambient Space Glow Background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />

          {/* 3D Rendered Sphere Container */}
          <div
            className={`relative w-64 h-64 rounded-full border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.25)] flex items-center justify-center transition-all duration-700 ${
              rotating ? "animate-pulse" : ""
            } ${wireframe ? "bg-transparent border-dashed" : "bg-gradient-to-br from-emerald-900/40 via-teal-950 to-slate-950"}`}
          >
            {/* Orbital Rings & Graticule Coordinates */}
            <div className="absolute inset-0 rounded-full border border-emerald-400/20 rotate-45" />
            <div className="absolute inset-0 rounded-full border border-teal-400/20 -rotate-45" />
            <div className="absolute inset-2 rounded-full border border-dashed border-emerald-500/15" />

            {/* Target ROI Marker Callout */}
            <div className="absolute z-10 flex flex-col items-center animate-bounce">
              <div className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold shadow-lg flex items-center gap-1">
                <Eye className="h-3 w-3" /> {locationLabel}
              </div>
              <div className="w-2 h-2 bg-emerald-400 rotate-45 -mt-1 shadow-md" />
            </div>

            {/* Coordinates Telemetry Overlay */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center pointer-events-none">
              <Badge className="bg-slate-900/90 text-emerald-400 border-slate-700 text-[10px] font-mono">
                LAT: {latitudeNum.toFixed(4)}° • LON: {longitudeNum.toFixed(4)}° • ALT: 705km (Landsat Orbit)
              </Badge>
            </div>
          </div>

          {/* Floating Controls HUD */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Elevation Profile</span>
            <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-emerald-400">
              Terrain Max: 1,420m (SRTM)
            </div>
          </div>

          <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setZoomLevel(Math.min(zoomLevel + 1, 5))}
              className="h-7 w-7 bg-slate-900/80 border-slate-800 text-white hover:bg-slate-800"
            >
              +
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setZoomLevel(Math.max(zoomLevel - 1, 1))}
              className="h-7 w-7 bg-slate-900/80 border-slate-800 text-white hover:bg-slate-800"
            >
              -
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
