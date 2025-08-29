
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, TrendingUp, Droplets, Leaf, Home, Mountain, Satellite, Loader2, CircleDotDashed, Rocket, RefreshCw } from "lucide-react";
import type { MetricData, SatellitePassData } from "@/lib/types";
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Button } from "./ui/button";

const metricIcons: { [key: string]: React.ReactNode } = {
  NDVI: <Leaf className="h-4 w-4 text-muted-foreground" />,
  NDWI: <Droplets className="h-4 w-4 text-muted-foreground" />,
  NDBI: <Home className="h-4 w-4 text-muted-foreground" />,
  NBR: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
  "default": <Mountain className="h-4 w-4 text-muted-foreground" />,
};

function getMetricCardData(metrics: MetricData[]) {
    const ndvi = metrics.find(m => m.name === 'NDVI');
    const ndwi = metrics.find(m => m.name === 'NDWI');
    const nbr = metrics.find(m => m.name === 'NBR');
    return [
        { title: 'Vegetation (NDVI)', metric: ndvi },
        { title: 'Water (NDWI)', metric: ndwi },
        { title: 'Burn Ratio (NBR)', metric: nbr },
    ];
}


export function SummaryCards({ metrics, nextPass, isFetchingPass, onFetchPass }: { metrics: MetricData[], nextPass: SatellitePassData | null, isFetchingPass: boolean, onFetchPass: () => void }) {
  const cardData = getMetricCardData(metrics);

  const renderNextPass = () => {
    if (isFetchingPass) {
        return (
            <div className="flex items-center text-sm text-muted-foreground h-[92px]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Fetching pass time...</span>
            </div>
        )
    }
    if (nextPass) {
        const passDate = new Date(nextPass.passTime);
        return (
             <div className="space-y-2">
                <div className="text-2xl font-bold">{format(passDate, "HH:mm:ss")}</div>
                <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(passDate, { addSuffix: true })}
                </p>
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1"><CircleDotDashed className="h-3 w-3" />Status:</span>
                    <Badge variant={nextPass.status.toLowerCase() === 'active' ? 'default' : 'secondary'}>{nextPass.status}</Badge>
                </div>
                 <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1"><Rocket className="h-3 w-3" />Speed:</span>
                    <span>{nextPass.speed.toFixed(2)} km/s</span>
                </div>
             </div>
        )
    }
    return (
        <div className="flex flex-col items-center justify-center text-center h-[92px]">
            <p className="text-sm text-muted-foreground mb-2">Fetch satellite pass data.</p>
            <Button onClick={onFetchPass} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> Fetch Next Pass
            </Button>
        </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cardData.map(({ title, metric }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {metricIcons[metric?.name || 'default']}
          </CardHeader>
          <CardContent>
            {metric ? (
              <>
                <div className="text-2xl font-bold">{metric.lastValue?.toFixed(4) || "N/A"}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  {metric.percentageChange !== null ? (
                    <>
                      {metric.percentageChange >= 0 ? (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={metric.percentageChange >= 0 ? "text-green-500" : "text-red-500"}>
                        {metric.percentageChange.toFixed(2)}%
                      </span>
                      &nbsp;from start
                    </>
                  ) : "No change data"}
                </p>
              </>
            ) : (
                <div className="text-2xl font-bold">N/A</div>
            )}
          </CardContent>
        </Card>
      ))}
      <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Satellite Pass</CardTitle>
            <Satellite className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextPass && <div className="font-semibold text-sm mb-2">{nextPass.satelliteName}</div>}
            {renderNextPass()}
          </CardContent>
      </Card>
    </div>
  );
}
