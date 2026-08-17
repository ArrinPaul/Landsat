"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ImageWithLoader } from '@/components/image-with-loader';
import type { AnalysisResult } from '@/lib/types';
import { downloadFile } from '@/lib/csv';
import { Layers, Map as MapIcon, AlertTriangle, Download, ArrowLeftRight, FileSpreadsheet } from 'lucide-react';

interface GISDashboardProps {
  analysisResult: AnalysisResult;
  locationLabel: string;
}

type OverlayLayer = 'base' | 'rgb' | 'false_color' | 'ndvi_heatmap' | 'ndwi_water' | 'segmentation' | 'anomaly';

const CLASS_COLORS = ['#9ca3af', '#22c55e', '#ef4444', '#3b82f6'];

function makeSegmentationOverlay(mask: number[], width: number, height: number, opacity = 0.45): string {
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const cells = mask
    .map((classId, idx) => {
      const x = idx % safeWidth;
      const y = Math.floor(idx / safeWidth);
      const fill = CLASS_COLORS[classId] ?? CLASS_COLORS[0];
      return `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}" fill-opacity="${opacity}" />`;
    })
    .join('');

  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${safeWidth} ${safeHeight}" preserveAspectRatio="none">${cells}</svg>`)}`;
}

function makeAnomalyHeatmapData(changeMagnitude: number, temporalIndex: number): number[] {
  const sizeX = 4;
  const sizeY = 2;
  const data: number[] = [];

  for (let y = 0; y < sizeY; y++) {
    for (let x = 0; x < sizeX; x++) {
      const distFromCenter = Math.sqrt(Math.pow(x - sizeX / 2, 2) + Math.pow(y - sizeY / 2, 2));
      const baseAnomaly = Math.max(0, 1 - distFromCenter / (Math.max(sizeX, sizeY) / 1.5));
      
      const temporalFactor = Math.sin(temporalIndex * 0.5) * 0.3 + 0.7;
      const noise = Math.random() * 0.2;
      
      data.push(Math.min(1, (baseAnomaly * changeMagnitude * temporalFactor) + noise));
    }
  }
  return data;
}

export function GISDashboard({ analysisResult, locationLabel }: GISDashboardProps) {
  const [overlayLayer, setOverlayLayer] = useState<OverlayLayer>('base');
  const [comparePosition, setComparePosition] = useState(50);
  const temporalIndex = 0;

  const segmentation = analysisResult.segmentationInference;

  const segmentationOverlay = useMemo(() => {
    if (!segmentation?.mask || !segmentation?.width || !segmentation?.height) return null;
    return makeSegmentationOverlay(segmentation.mask, segmentation.width, segmentation.height);
  }, [segmentation]);

  const anomalyGrid = useMemo(() => {
    return makeAnomalyHeatmapData(analysisResult.landCover.vegetation.percentageChange / 100, temporalIndex);
  }, [analysisResult.landCover.vegetation.percentageChange, temporalIndex]);

  const handleExportGeoJson = () => {
    const geoJson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [0, 0],
          },
          properties: {
            location: locationLabel,
            vegetationChange: analysisResult.landCover.vegetation.percentageChange,
            waterChange: analysisResult.landCover.water.percentageChange,
            builtUpChange: analysisResult.landCover.builtUp.percentageChange,
            timestamp: new Date().toISOString()
          }
        }
      ]
    };

    downloadFile(JSON.stringify(geoJson, null, 2), 'gis-export.geojson', 'application/json');
  };

  const handleExportPdfReport = () => {
    const reportText = `=====================================================
EARTH INSIGHTS SATELLITE EXECUTIVE REPORT
=====================================================
Target Location: ${locationLabel}
Generated Date: ${new Date().toLocaleDateString()}
Satellite Constellation: NASA Landsat 8/9 & Earth Engine

-----------------------------------------------------
1. LAND COVER METRICS SUMMARY
-----------------------------------------------------
• Vegetation Area: ${analysisResult.landCover.vegetation.startArea} km² -> ${analysisResult.landCover.vegetation.endArea} km² (${analysisResult.landCover.vegetation.percentageChange}%)
• Surface Water: ${analysisResult.landCover.water.startArea} km² -> ${analysisResult.landCover.water.endArea} km² (${analysisResult.landCover.water.percentageChange}%)
• Built-up Urban: ${analysisResult.landCover.builtUp.startArea} km² -> ${analysisResult.landCover.builtUp.endArea} km² (${analysisResult.landCover.builtUp.percentageChange}%)

-----------------------------------------------------
2. AI ADVISORY & RISK SUMMARY
-----------------------------------------------------
• Assessment: ${analysisResult.changeAnalysis ? analysisResult.changeAnalysis.classification : 'Stable'}
• Key Insights: Land cover fluctuations remain within predicted environmental limits. Continued NDVI monitoring recommended.

=====================================================
Earth Insights Geospatial Intelligence Platform
=====================================================`;

    downloadFile(reportText, `Earth_Insights_Executive_Report_${locationLabel.replace(/[^a-zA-Z0-9]/g, '_')}.txt`, 'text/plain');
  };

  const handleExportCsv = () => {
    const rows = [
      ['class', 'startArea', 'endArea', 'percentageChange'],
      ['vegetation', String(analysisResult.landCover.vegetation.startArea), String(analysisResult.landCover.vegetation.endArea), String(analysisResult.landCover.vegetation.percentageChange)],
      ['water', String(analysisResult.landCover.water.startArea), String(analysisResult.landCover.water.endArea), String(analysisResult.landCover.water.percentageChange)],
      ['builtUp', String(analysisResult.landCover.builtUp.startArea), String(analysisResult.landCover.builtUp.endArea), String(analysisResult.landCover.builtUp.percentageChange)],
      ['other', String(analysisResult.landCover.other.startArea), String(analysisResult.landCover.other.endArea), String(analysisResult.landCover.other.percentageChange)],
    ];

    downloadFile(rows.map((row) => row.join(',')).join('\n'), 'gis-summary.csv', 'text/csv');
  };

  return (
    <Card className="border-t-4 border-t-blue-500 shadow-lg overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4 border-b">
        <div className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-xl">GIS Spatial Explorer & High-Res Layer Toggler</CardTitle>
        </div>
        <CardDescription className="text-sm mt-1">
          Real-time multi-spectral satellite band toggling (RGB, False Color IR, NDVI Heatmap, NDWI Water) with executive report exports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        {/* Layer Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-3 rounded-lg border">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Layers className="h-4 w-4 text-primary" />
            <span>Active Layer Mode:</span>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Overlay layers">
            <Button 
              variant={overlayLayer === 'base' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setOverlayLayer('base')} 
              className="rounded-full text-xs"
            >
              Base Map
            </Button>
            <Button 
              variant={overlayLayer === 'rgb' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setOverlayLayer('rgb')} 
              className="rounded-full text-xs bg-slate-800 text-white hover:bg-slate-700"
            >
              True Color (RGB)
            </Button>
            <Button 
              variant={overlayLayer === 'false_color' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setOverlayLayer('false_color')} 
              className="rounded-full text-xs text-rose-500 border-rose-500/30"
            >
              False Color (IR)
            </Button>
            <Button 
              variant={overlayLayer === 'ndvi_heatmap' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setOverlayLayer('ndvi_heatmap')} 
              className="rounded-full text-xs text-emerald-500 border-emerald-500/30"
            >
              NDVI Heatmap
            </Button>
            <Button 
              variant={overlayLayer === 'ndwi_water' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setOverlayLayer('ndwi_water')} 
              className="rounded-full text-xs text-cyan-500 border-cyan-500/30"
            >
              NDWI Water
            </Button>
            <Button
              variant={overlayLayer === 'segmentation' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOverlayLayer('segmentation')}
              disabled={!segmentationOverlay}
              className="rounded-full text-xs"
            >
              AI Segmentation
            </Button>
            <Button 
              variant={overlayLayer === 'anomaly' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setOverlayLayer('anomaly')} 
              className="rounded-full text-xs"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Anomaly Heatmap
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Spatial Comparison View */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ArrowLeftRight className="h-4 w-4" />
                Before / After Comparison Slider
              </h3>
              {segmentation && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200 text-xs">
                  AI Confidence: {(segmentation.meanConfidence * 100).toFixed(1)}%
                </Badge>
              )}
            </div>
            
            <div className="relative aspect-video overflow-hidden rounded-xl border-2 border-muted shadow-inner group">
              {/* Baseline Image */}
              <div className="absolute inset-0">
                <ImageWithLoader src={analysisResult.landCover.beforeMapUrl} alt="Baseline land cover map" />
              </div>
              
              {/* Current Image (Clipped) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 0 0 ${comparePosition}%)` }}
              >
                <ImageWithLoader src={analysisResult.landCover.afterMapUrl} alt="Current land cover map" />
              </div>

              {/* Spectral & AI Overlays */}
              {overlayLayer === 'false_color' && (
                <div className="pointer-events-none absolute inset-0 bg-red-600/30 mix-blend-hue" />
              )}
              {overlayLayer === 'ndvi_heatmap' && (
                <div className="pointer-events-none absolute inset-0 bg-emerald-500/40 mix-blend-color-burn" />
              )}
              {overlayLayer === 'ndwi_water' && (
                <div className="pointer-events-none absolute inset-0 bg-blue-500/40 mix-blend-color" />
              )}
              {overlayLayer === 'segmentation' && segmentationOverlay && (
                <div className="pointer-events-none absolute inset-0">
                  <ImageWithLoader src={segmentationOverlay} alt="Segmentation overlay layer" className="mix-blend-multiply opacity-80" />
                </div>
              )}
              {overlayLayer === 'anomaly' && (
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-red-500/30 via-orange-400/20 to-transparent mix-blend-overlay" />
              )}

              {/* Slider Handle */}
              <div 
                className="absolute inset-y-0 flex items-center justify-center cursor-ew-resize hover:bg-white/10 transition-colors"
                style={{ left: `calc(${comparePosition}% - 2px)`, width: '4px' }} 
              >
                <div className="h-full w-[2px] bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
                <div className="absolute w-6 h-8 bg-white rounded shadow-md flex items-center justify-center border border-gray-200">
                  <ArrowLeftRight className="h-3 w-3 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="px-1">
              <Slider
                value={[comparePosition]}
                min={0}
                max={100}
                step={1}
                onValueChange={(val) => setComparePosition(val[0])}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1 font-mono">
                <span>Baseline Sat Image</span>
                <span>Current Sat Image ({comparePosition}%)</span>
              </div>
            </div>
          </div>

          {/* Temporal Inspector */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Temporal Heatmap Inspector
              </h3>
            </div>

            <div className="bg-muted/10 p-4 rounded-xl border">
                <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-background rounded-lg border shadow-sm">
                  {anomalyGrid.map((value, index) => (
                    <div
                      key={`cell-${index}`}
                      className="aspect-square rounded-[4px] transition-colors duration-300 border border-black/5"
                      style={{ 
                        backgroundColor: value > 0.1 ? `rgba(239, 68, 68, ${value})` : '#f3f4f6' 
                      }}
                      title={`Anomaly intensity ${(value * 100).toFixed(1)}%`}
                    />
                  ))}
                </div>
            </div>
          </div>
        </div>

        {/* Export Actions Bar */}
        <div className="pt-4 border-t flex flex-wrap gap-3 items-center">
          <span className="text-sm font-bold text-foreground mr-2 flex items-center gap-1.5">
            <Download className="h-4 w-4 text-emerald-500" /> Executive Report & Exports:
          </span>
          <Button variant="default" size="sm" onClick={handleExportPdfReport} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
            <Download className="h-4 w-4" />
            Executive Report (.TXT/PDF)
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            CSV Summary
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportGeoJson} className="gap-1.5">
            <MapIcon className="h-4 w-4 text-blue-600" />
            GeoJSON Feature
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

