
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { addDays, format, formatISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { InputPanel } from "@/components/input-panel";
import { SummaryCards } from "@/components/summary-cards";
import { MetricsTable } from "@/components/metrics-table";
import { Visualizations } from "@/components/visualizations";
import { WeatherReport } from "@/components/weather-report";
import { LandCoverAnalysis } from "@/components/land-cover-analysis";
import { useToast } from "@/hooks/use-toast";
import type { GroundTruthDataPoint, SatellitePassData, WeatherData, HistoryEntry, AnalysisResult } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { predictSatellitePassAction, getWeatherReportAction, computeMetricsAction } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Map } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Chatbot } from "./chatbot";
import { MonitoringCard } from "./monitoring-card";

export function Dashboard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [lat, setLat] = useState("40.7128");
  const [lon, setLon] = useState("-74.0060");
  const [locationDesc, setLocationDesc] = useState("New York City");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -365),
    to: new Date(),
  });
  const [groundTruthData, setGroundTruthData] = useState<GroundTruthDataPoint[] | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string>("NDVI");
  const [nextPass, setNextPass] = useState<SatellitePassData | null>(null);
  const [isFetchingPass, setIsFetchingPass] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeComputation, setActiveComputation] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setNotificationsEnabled(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!nextPass || !notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const passTime = new Date(nextPass.passTime);
    const now = new Date();
    const notificationTime = passTime.getTime() - 60000; 
    const delay = notificationTime - now.getTime();

    if (delay > 0) {
      const timerId = setTimeout(() => {
        new Notification("Satellite Alert", {
          body: `Satellite ${nextPass.satelliteName} will pass over your selected location (${lat}, ${lon}) in 1 minute.`,
          icon: "/favicon.ico",
        });
      }, delay);

      return () => clearTimeout(timerId);
    }
  }, [nextPass, lat, lon, notificationsEnabled]);


  const fetchNextPass = useCallback(async () => {
      if (!lat || !lon) {
           toast({ title: t('dashboard.error.noCoords.title'), description: t('dashboard.error.noCoords.description'), variant: "destructive" });
           return;
      }
      setIsFetchingPass(true);
      const result = await predictSatellitePassAction({ latitude: parseFloat(lat), longitude: parseFloat(lon) });
      if (result.error) {
          toast({ title: t('predict.error.aiError.title'), description: result.error, variant: "destructive" });
          setNextPass(null);
      } else if (result.data) {
          setNextPass(result.data);
      }
      setIsFetchingPass(false);
  }, [lat, lon, toast, t]);

  const fetchWeather = useCallback(async () => {
    if (!lat || !lon) {
        toast({ title: t('dashboard.error.noCoords.title'), description: t('dashboard.error.noCoords.description'), variant: "destructive" });
        return;
    }
    setIsFetchingWeather(true);
    const result = await getWeatherReportAction({ latitude: parseFloat(lat), longitude: parseFloat(lon) });
    if (result.error) {
      toast({ title: t('predict.error.aiError.title'), description: result.error, variant: "destructive" });
      setWeather(null);
    } else if (result.data) {
      setWeather(result.data);
    }
    setIsFetchingWeather(false);
  }, [lat, lon, toast, t]);
  
  const handleHistorySelect = (entry: HistoryEntry) => {
    setLat(entry.lat);
    setLon(entry.lon);
    setLocationDesc(entry.locationDesc);
    setDateRange(entry.dateRange);
    toast({ title: t('dashboard.history.toast.title'), description: t('dashboard.history.toast.description', { location: entry.locationDesc })});
  };
  
  const handleCompute = useCallback(async () => {
    if (!lat || !lon) {
      toast({ title: t('dashboard.error.invalidCoords.title'), description: t('dashboard.error.invalidCoords.description'), variant: "destructive" });
      return;
    }
    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast({ title: t('dashboard.error.noDate.title'), description: t('dashboard.error.noDate.description'), variant: "destructive" });
      return;
    }

    setIsComputing(true);
    setActiveComputation(true);
    setAnalysisResult(null);
    setNextPass(null);
    setWeather(null);
    
    const newHistoryEntry: HistoryEntry = {
      id: new Date().toISOString(),
      lat,
      lon,
      locationDesc,
      dateRange,
      timestamp: new Date(),
    };
    setHistory(prev => [newHistoryEntry, ...prev.slice(0, 9)]);

    // Fetch ancillary data in parallel with the main computation
    fetchNextPass();
    fetchWeather();

    const result = await computeMetricsAction({
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        startDate: formatISO(dateRange.from, { representation: 'date' }),
        endDate: formatISO(dateRange.to, { representation: 'date' }),
    });

    if (result.error || !result.data) {
        toast({ title: t('dashboard.error.compute.title'), description: result.error || t('dashboard.error.compute.description'), variant: "destructive" });
        setAnalysisResult(null);
    } else {
        setAnalysisResult(result.data);
        setSelectedMetric('NDVI');
        toast({ title: t('dashboard.compute.success.title'), description: t('dashboard.compute.success.description') });
    }
    
    setIsComputing(false);

  }, [lat, lon, locationDesc, dateRange, toast, t, fetchNextPass, fetchWeather]);
  
  const dateRangeString = dateRange?.from && dateRange?.to 
    ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
    : "N/A";

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-6">
      <InputPanel
        lat={lat}
        setLat={setLat}
        lon={lon}
        setLon={setLon}
        locationDesc={locationDesc}
        setLocationDesc={setLocationDesc}
        dateRange={dateRange}
        setDateRange={setDateRange}
        onCompute={handleCompute}
        isComputing={isComputing}
        onFileUpload={setGroundTruthData}
        history={history}
        onHistorySelect={handleHistorySelect}
      />

      {isComputing && (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
             <Skeleton className="h-48" />
            <Skeleton className="h-96" />
        </div>
      )}
      
      {!activeComputation && !isComputing && (
          <Card className="text-center py-16">
            <CardHeader>
                <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit">
                    <Map className="h-10 w-10" />
                </div>
                <CardTitle>{t('dashboard.welcome.title')}</CardTitle>
                <CardDescription className="max-w-md mx-auto">{t('dashboard.welcome.description')}</CardDescription>
            </CardHeader>
          </Card>
      )}

      {activeComputation && !isComputing && !analysisResult && (
          <Card className="text-center py-16">
            <CardContent>
                <p className="text-muted-foreground">{t('dashboard.compute.failure')}</p>
            </CardContent>
          </Card>
      )}

      {analysisResult && !isComputing && (
        <>
          <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-4">
            <div className="xl:col-span-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCards 
                landCover={analysisResult.landCover}
              />
            </div>
            <div className="xl:col-span-1 grid gap-6">
                 <WeatherReport 
                    weather={weather} 
                    isLoading={isFetchingWeather} 
                    showForecast={false}
                    onFetchWeather={fetchWeather}
                />
                 <MonitoringCard />
            </div>
          </div>

          <LandCoverAnalysis landCover={analysisResult.landCover} />

          <MetricsTable 
            analysisResult={analysisResult} 
            location={`${lat}, ${lon}`}
            dateRange={dateRangeString}
          />

          <Visualizations
            analysisResult={analysisResult}
            groundTruthData={groundTruthData}
            selectedMetric={selectedMetric}
            setSelectedMetric={setSelectedMetric}
            locationDescription={locationDesc}
            dateRange={dateRange}
          />
        </>
      )}
      <Chatbot lat={lat} lon={lon} />
    </div>
  );
}
