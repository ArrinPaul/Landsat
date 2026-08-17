"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Crosshair, Check, Layers } from 'lucide-react';

export type PolygonPoint = { lat: number; lng: number };

interface CustomPolygonDrawerProps {
  initialLat: string;
  initialLon: string;
  onPolygonComplete: (points: PolygonPoint[], centerLat: string, centerLon: string) => void;
}

export function CustomPolygonDrawer({ initialLat, initialLon, onPolygonComplete }: CustomPolygonDrawerProps) {
  const baseLat = parseFloat(initialLat) || 40.7128;
  const baseLng = parseFloat(initialLon) || -74.006;

  const [points, setPoints] = useState<PolygonPoint[]>([]);

  // Generate 4-point bounding box polygon relative to current lat/lng
  const handleQuickPreset = (radiusKm = 2) => {
    const delta = radiusKm * 0.009; // Approx degree conversion
    const preset: PolygonPoint[] = [
      { lat: Number((baseLat + delta).toFixed(4)), lng: Number((baseLng - delta).toFixed(4)) },
      { lat: Number((baseLat + delta).toFixed(4)), lng: Number((baseLng + delta).toFixed(4)) },
      { lat: Number((baseLat - delta).toFixed(4)), lng: Number((baseLng + delta).toFixed(4)) },
      { lat: Number((baseLat - delta).toFixed(4)), lng: Number((baseLng - delta).toFixed(4)) },
    ];
    setPoints(preset);
  };

  const handleAddVertex = () => {
    // Add jittered vertex near center for custom ROI definition
    const randomLatOffset = (Math.random() - 0.5) * 0.02;
    const randomLngOffset = (Math.random() - 0.5) * 0.02;
    const newPt = {
      lat: Number((baseLat + randomLatOffset).toFixed(4)),
      lng: Number((baseLng + randomLngOffset).toFixed(4)),
    };
    setPoints((prev) => [...prev, newPt]);
  };

  const handleRemoveVertex = (index: number) => {
    setPoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClear = () => {
    setPoints([]);
  };

  const handleApplyROI = () => {
    if (points.length < 3) return;
    const avgLat = (points.reduce((acc, p) => acc + p.lat, 0) / points.length).toFixed(4);
    const avgLng = (points.reduce((acc, p) => acc + p.lng, 0) / points.length).toFixed(4);
    onPolygonComplete(points, avgLat, avgLng);
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Custom ROI Polygon Drawer</CardTitle>
              <CardDescription className="text-xs">Draw bounding land polygon coordinates for targeted Landsat analysis</CardDescription>
            </div>
          </div>
          <Badge variant={points.length >= 3 ? "default" : "outline"} className="text-xs">
            {points.length} Vertices {points.length >= 3 ? "(Valid Polygon)" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleQuickPreset(1)} className="text-xs gap-1">
            <Crosshair className="h-3.5 w-3.5" /> 1km² Plot
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleQuickPreset(5)} className="text-xs gap-1">
            <Crosshair className="h-3.5 w-3.5" /> 5km² Plot
          </Button>
          <Button size="sm" variant="secondary" onClick={handleAddVertex} className="text-xs gap-1">
            + Add Vertex
          </Button>
          {points.length > 0 && (
            <Button size="sm" variant="ghost" onClick={handleClear} className="text-xs text-rose-500 gap-1 ml-auto">
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>

        {/* Vertices Coordinate Table */}
        {points.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 max-h-40 overflow-y-auto space-y-1.5">
            <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b">
              <span className="col-span-2">Point</span>
              <span className="col-span-4">Latitude</span>
              <span className="col-span-4">Longitude</span>
              <span className="col-span-2 text-right">Action</span>
            </div>
            {points.map((pt, idx) => (
              <div key={idx} className="grid grid-cols-12 text-xs font-mono items-center py-1 border-b border-border/50 last:border-0">
                <span className="col-span-2 font-bold text-primary">P{idx + 1}</span>
                <span className="col-span-4">{pt.lat}</span>
                <span className="col-span-4">{pt.lng}</span>
                <button
                  onClick={() => handleRemoveVertex(idx)}
                  className="col-span-2 text-right text-rose-500 hover:underline text-[10px]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Apply Polygon Action */}
        <Button
          disabled={points.length < 3}
          onClick={handleApplyROI}
          className="w-full font-semibold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <Check className="h-4 w-4" /> Apply Custom Polygon ROI
        </Button>
      </CardContent>
    </Card>
  );
}
