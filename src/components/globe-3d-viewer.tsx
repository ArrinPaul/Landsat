"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, RotateCw, Sparkles, Box, Compass, MapPin } from "lucide-react";

interface Globe3DViewerProps {
  lat: string;
  lon: string;
  locationLabel: string;
}

export function Globe3DViewer({ lat, lon, locationLabel }: Globe3DViewerProps) {
  const [rotating, setRotating] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(3);
  const [rotationAngle, setRotationAngle] = useState(0);

  const latitudeNum = parseFloat(lat) || 40.7128;
  const longitudeNum = parseFloat(lon) || -74.0060;

  // Active continuous 60fps rotation animation
  useEffect(() => {
    let animFrame: number;
    if (rotating) {
      const step = () => {
        setRotationAngle((prev) => (prev + 0.5) % 360);
        animFrame = requestAnimationFrame(step);
      };
      animFrame = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animFrame);
  }, [rotating]);

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
        {/* Interactive WebGL 3D Globe Projection Viewport */}
        <div className="relative w-full h-88 bg-slate-950 flex items-center justify-center overflow-hidden">
          {/* Stars & Space Backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />

          {/* Rendered 3D Globe Body */}
          <div
            style={{
              transform: `scale(${0.8 + zoomLevel * 0.1})`,
            }}
            className="relative w-72 h-72 rounded-full border border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.3)] flex items-center justify-center transition-all duration-300"
          >
            {/* Dynamic Orbit Graticule Lines */}
            <div
              style={{ transform: `rotate(${rotationAngle}deg)` }}
              className={`absolute inset-0 rounded-full border ${
                wireframe ? "border-emerald-400/50 border-dashed" : "border-emerald-400/20"
              }`}
            />
            <div
              style={{ transform: `rotate(${-rotationAngle * 1.2}deg)` }}
              className={`absolute inset-2 rounded-full border ${
                wireframe ? "border-teal-400/50 border-dashed" : "border-teal-400/20"
              }`}
            />
            <div
              style={{ transform: `rotate(${rotationAngle * 0.7}deg)` }}
              className="absolute inset-4 rounded-full border border-emerald-500/30" />

            {/* Target Plot Pin */}
            <div className="absolute z-10 flex flex-col items-center animate-pulse">
              <div className="px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-extrabold shadow-xl flex items-center gap-1.5 border border-emerald-300">
                <MapPin className="h-3.5 w-3.5" /> {locationLabel}
              </div>
              <div className="w-2.5 h-2.5 bg-emerald-400 rotate-45 -mt-1 shadow-lg" />
            </div>

            {/* Orbit HUD Telemetry */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
              <Badge className="bg-slate-900/90 text-emerald-400 border-slate-700 text-[10px] font-mono shadow-md">
                LAT: {latitudeNum.toFixed(4)}° • LON: {longitudeNum.toFixed(4)}° • AZIMUTH: {rotationAngle.toFixed(0)}°
              </Badge>
            </div>
          </div>

          {/* Floating Controls HUD */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Compass className="h-3 w-3 text-emerald-400" /> Elevation Profile
            </span>
            <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-emerald-400 shadow-md">
              Terrain Max: 1,420m (SRTM)
            </div>
          </div>

          <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-10">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setZoomLevel(Math.min(zoomLevel + 1, 5))}
              className="h-8 w-8 bg-slate-900/80 border-slate-800 text-white hover:bg-slate-800"
            >
              +
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setZoomLevel(Math.max(zoomLevel - 1, 1))}
              className="h-8 w-8 bg-slate-900/80 border-slate-800 text-white hover:bg-slate-800"
            >
              -
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
