
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Upload, Wand2, Cpu, Loader2, History, Wheat, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { parseCsv } from "@/lib/csv";
import { suggestCoordinatesAction } from "@/lib/actions";
import type { GroundTruthDataPoint, HistoryEntry, SatelliteSource } from "@/lib/types";
import { ScrollArea } from "./ui/scroll-area";
import { useLanguage } from "@/hooks/use-language";

const SATELLITE_OPTIONS: { value: SatelliteSource; label: string; hint: string }[] = [
  { value: "sentinel2", label: "Sentinel-2 (10m)", hint: "Best default: 10m resolution, ~5-day revisit" },
  { value: "landsat", label: "Landsat 8/9 (30m)", hint: "30m resolution, adds long historical heritage" },
  { value: "modis", label: "MODIS (500m)", hint: "500m resolution, daily revisit for trend context" },
];

const MIN_RADIUS_M = 10;
const MAX_RADIUS_M = 2000;

interface InputPanelProps {
  lat: string;
  setLat: (val: string) => void;
  lon: string;
  setLon: (val: string) => void;
  locationDesc: string;
  setLocationDesc: (val: string) => void;
  dateRange?: DateRange;
  setDateRange: (range?: DateRange) => void;
  radiusMeters: number;
  setRadiusMeters: (val: number) => void;
  satelliteSource: SatelliteSource;
  setSatelliteSource: (val: SatelliteSource) => void;
  onCompute: () => void;
  isComputing: boolean;
  onFileUpload: (data: GroundTruthDataPoint[] | null) => void;
  history: HistoryEntry[];
  onHistorySelect: (entry: HistoryEntry) => void;
}

export function InputPanel({
  lat, setLat, lon, setLon, locationDesc, setLocationDesc,
  dateRange, setDateRange, radiusMeters, setRadiusMeters,
  satelliteSource, setSatelliteSource, onCompute, isComputing, onFileUpload,
  history, onHistorySelect
}: InputPanelProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [fileName, setFileName] =useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsedData = parseCsv(text, t);
        if ('error' in parsedData) {
          toast({ title: t('dashboard.csv.error.title'), description: parsedData.error, variant: "destructive" });
          onFileUpload(null);
        } else {
          toast({ title: t('dashboard.csv.success.title'), description: t('dashboard.csv.success.description', { count: parsedData.length }) });
          onFileUpload(parsedData);
        }
      };
      reader.readAsText(file);
    } else {
        setFileName("");
        onFileUpload(null);
    }
  };

  const handleSuggestCoordinates = async () => {
    if (!locationDesc) {
      toast({ title: t('predict.error.noLocation.title'), description: t('predict.error.noLocation.description'), variant: "destructive" });
      return;
    }
    setIsSuggesting(true);
    const result = await suggestCoordinatesAction(locationDesc);
    if (result.error) {
      toast({ title: t('predict.error.aiError.title'), description: result.error, variant: "destructive" });
    } else if (result.data) {
      setLat(result.data.latitude.toFixed(4));
      setLon(result.data.longitude.toFixed(4));
      toast({ title: t('predict.coordinatesSuggested.title'), description: `${t('predict.coordinatesSuggested.confidence')}: ${(result.data.confidence * 100).toFixed(0)}%` });
    }
    setIsSuggesting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.input.title')}</CardTitle>
        <CardDescription>
          {t('dashboard.input.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2 col-span-1 md:col-span-2">
            <Label htmlFor="location-desc">{t('dashboard.input.locationDesc')}</Label>
            <div className="flex gap-2">
              <Input
                id="location-desc"
                className="flex-1"
                placeholder={t('dashboard.input.locationDescPlaceholder')}
                value={locationDesc}
                onChange={(e) => setLocationDesc(e.target.value)}
                disabled={isSuggesting}
              />
              <Button onClick={handleSuggestCoordinates} disabled={isSuggesting || !locationDesc} size="icon">
                {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                <span className="sr-only">{t('predict.suggestCoordinates')}</span>
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="latitude">{t('predict.latitude')}</Label>
            <Input id="latitude" placeholder="e.g., 40.7128" value={lat} onChange={(e) => setLat(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">{t('predict.longitude')}</Label>
            <Input id="longitude" placeholder="e.g., -74.0060" value={lon} onChange={(e) => setLon(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="radius">Analysis radius (meters)</Label>
            <Input
              id="radius"
              type="number"
              min={MIN_RADIUS_M}
              max={MAX_RADIUS_M}
              value={radiusMeters}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                if (!Number.isNaN(parsed)) {
                  setRadiusMeters(Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, parsed)));
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              How far around the pin to analyze - small values ({MIN_RADIUS_M}-200m) target a specific field or lot; larger values cover more ground.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="satellite-source">Satellite source</Label>
            <Select value={satelliteSource} onValueChange={(v) => setSatelliteSource(v as SatelliteSource)}>
              <SelectTrigger id="satellite-source">
                <Satellite className="mr-2 h-4 w-4 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SATELLITE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {SATELLITE_OPTIONS.find((o) => o.value === satelliteSource)?.hint}
            </p>
          </div>
          <div className="space-y-2">
            <Label>{t('dashboard.input.dateRange')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>{t('dashboard.input.pickDate')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="csv-upload">{t('dashboard.input.groundTruth')}</Label>
            <Button asChild variant="outline" className="w-full justify-start text-left font-normal">
                <Label htmlFor="csv-upload" className="w-full cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    <span className="truncate">{fileName || t('dashboard.input.uploadFile')}</span>
                </Label>
            </Button>
            <Input id="csv-upload" type="file" accept=".csv" className="sr-only" onChange={handleFileChange} />
          </div>
        </div>
         <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={history.length === 0} className="w-full sm:w-auto">
                  <History className="mr-2 h-4 w-4" /> {t('dashboard.history.button')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">{t('dashboard.history.title')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.history.description')}
                    </p>
                  </div>
                  <ScrollArea className="h-64">
                    {history.length > 0 ? (
                      <div className="grid gap-2">
                        {history.map((entry) => (
                           <div
                             key={entry.id}
                             onClick={() => onHistorySelect(entry)}
                             className="text-sm p-2 hover:bg-muted rounded-md cursor-pointer"
                           >
                            <p className="font-semibold truncate">{entry.locationDesc || `${entry.lat}, ${entry.lon}`}</p>
                             <p className="text-xs text-muted-foreground">
                               {format(entry.timestamp, "PPP p")}
                             </p>
                           </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">{t('dashboard.history.empty')}</p>
                    )}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="secondary" asChild className="flex-1 sm:flex-initial">
                    <Link href={`/crop-advisor?lat=${lat}&lon=${lon}`}>
                        <Wheat className="mr-2 h-4 w-4" />
                        {t('dashboard.input.cropAdvisor')}
                    </Link>
                </Button>
                <Button onClick={onCompute} disabled={isComputing} className="flex-1 sm:flex-initial">
                {isComputing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Cpu className="mr-2 h-4 w-4" />
                )}
                {t('dashboard.input.compute')}
                </Button>
            </div>
          </div>
      </CardContent>
    </Card>
  );
}
