
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Building, AreaChart, Satellite, Loader2, CircleDotDashed, Rocket, RefreshCw } from "lucide-react";
import type { LandCoverAnalysis, SatellitePassData } from "@/lib/types";
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Button } from "./ui/button";
import { useLanguage } from "@/hooks/use-language";

interface SummaryCardsProps {
    landCover: LandCoverAnalysis;
    nextPass: SatellitePassData | null;
    isFetchingPass: boolean;
    onFetchPass: () => void;
}

const ChangeIndicator = ({ value }: { value: number }) => {
    const { t } = useLanguage();
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
        <p className="text-xs text-muted-foreground flex items-center">
            {isPositive ? <ArrowUp className="h-4 w-4 text-green-500" /> : <ArrowDown className="h-4 w-4 text-red-500" />}
            <span className={isPositive ? "text-green-500" : "text-red-500"}>
                {value.toFixed(2)}%
            </span>
            &nbsp;{t('dashboard.summary.change')}
        </p>
    );
};

export function SummaryCards({ landCover, nextPass, isFetchingPass, onFetchPass }: SummaryCardsProps) {
  const { t } = useLanguage();

  const renderNextPass = () => {
    if (isFetchingPass) {
        return (
            <div className="flex items-center text-sm text-muted-foreground h-[92px]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>{t('dashboard.summary.fetchingPass')}</span>
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
                    <span className="flex items-center gap-1"><CircleDotDashed className="h-3 w-3" />{t('dashboard.summary.status')}:</span>
                    <Badge variant={nextPass.status.toLowerCase() === 'active' ? 'default' : 'secondary'}>{nextPass.status}</Badge>
                </div>
                 <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1"><Rocket className="h-3 w-3" />{t('dashboard.summary.speed')}:</span>
                    <span>{nextPass.speed.toFixed(2)} km/s</span>
                </div>
             </div>
        )
    }
    return (
        <div className="flex flex-col items-center justify-center text-center h-[92px]">
            <p className="text-sm text-muted-foreground mb-2">{t('dashboard.summary.fetchPrompt')}</p>
            <Button onClick={onFetchPass} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> {t('dashboard.summary.fetchButton')}
            </Button>
        </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.summary.builtUp')}</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {landCover.builtUp.absoluteChange >= 0 ? '+' : ''}
                {landCover.builtUp.absoluteChange.toFixed(2)} km²
            </div>
            <ChangeIndicator value={landCover.builtUp.percentageChange} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.summary.vegetation')}</CardTitle>
            <AreaChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {landCover.vegetation.absoluteChange >= 0 ? '+' : ''}
                {landCover.vegetation.absoluteChange.toFixed(2)} km²
            </div>
            <ChangeIndicator value={landCover.vegetation.percentageChange} />
          </CardContent>
        </Card>
      <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.summary.nextPass')}</CardTitle>
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
