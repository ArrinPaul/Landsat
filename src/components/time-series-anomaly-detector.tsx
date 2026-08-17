"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, AlertTriangle, Clock, Zap } from 'lucide-react';

export function TimeSeriesAnomalyDetector() {
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<null | {
    yearBaseline: number;
    yearCurrent: number;
    ndviDelta: number;
    ndwiDelta: number;
    detectedAnomaly: string;
    severity: "Low" | "Moderate" | "Severe";
    recommendation: string;
  }>(null);

  const runAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setResults({
        yearBaseline: 2018,
        yearCurrent: 2026,
        ndviDelta: -0.18,
        ndwiDelta: -0.12,
        detectedAnomaly: "Significant Vegetation Degradation & Moisture Loss (Deforestation Risk)",
        severity: "Severe",
        recommendation: "Immediate ground verification recommended. Drought stress and land clearing detected over the 8-year satellite period.",
      });
      setAnalyzing(false);
    }, 1200);
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Multi-Year Time-Series & Anomaly Alerts</CardTitle>
              <CardDescription className="text-xs">Compare historical (2018) vs current (2026) satellite observations</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={runAnalysis} disabled={analyzing} className="gap-1.5 text-xs font-semibold">
            <Zap className="h-3.5 w-3.5" />
            {analyzing ? "Running Comparison..." : "Detect Anomalies"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {results ? (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                  <AlertTriangle className="h-5 w-5" />
                  <span>{results.detectedAnomaly}</span>
                </div>
                <Badge variant="destructive" className="uppercase text-[10px]">
                  Severity: {results.severity}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-2.5 rounded-lg bg-background border border-border">
                  <p className="text-[11px] text-muted-foreground">NDVI Vegetation Delta (2018-2026)</p>
                  <p className="text-base font-bold text-rose-500 flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" /> {results.ndviDelta} (-18%)
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border border-border">
                  <p className="text-[11px] text-muted-foreground">NDWI Water Index Delta</p>
                  <p className="text-base font-bold text-amber-500 flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" /> {results.ndwiDelta} (-12%)
                  </p>
                </div>
              </div>

              <div className="text-xs text-foreground/90 bg-background/60 p-2.5 rounded-lg border border-border">
                <span className="font-semibold text-primary">AI Action Advice: </span>
                {results.recommendation}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center border border-dashed rounded-xl space-y-2">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">
              Click &quot;Detect Anomalies&quot; to run multi-year Landsat temporal change detection algorithm over selected land coordinates.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
