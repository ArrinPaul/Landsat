
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wand2, Loader2, Thermometer, Tractor, Droplets, LandPlot, BarChartBig, CloudRain, AlertTriangle, BrainCircuit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
    suggestCoordinatesAction, 
    getWeatherReportAction, 
    planCropsAction, 
    scheduleIrrigationAction,
    predictSoilMoistureAction,
    predictCropYieldAction,
    analyzeDroughtAndFloodRiskAction,
    runScenarioAnalysisAction,
} from "@/lib/actions";
import type { WeatherData, CropPlan, IrrigationSchedule, SoilMoisturePrediction, CropYieldPrediction, DroughtFloodRisk, ScenarioAnalysis } from "@/lib/types";
import { WeatherReport } from "@/components/weather-report";
import { useLanguage } from "@/hooks/use-language";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactSheet } from "@/components/contact-sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const cropOptions = ["Corn", "Wheat", "Rice", "Soybeans", "Cotton", "Potatoes", "Tomatoes", "Barley", "Sorghum"];

export default function PredictPage() {
    const { toast } = useToast();
    const { t } = useLanguage();
    const [lat, setLat] = useState("40.7128");
    const [lon, setLon] = useState("-74.0060");
    const [locationDesc, setLocationDesc] = useState("New York City");
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isLoading, setIsLoading] = useState<PredictionType | null>(null);

    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [cropPlan, setCropPlan] = useState<CropPlan | null>(null);
    const [irrigationSchedule, setIrrigationSchedule] = useState<IrrigationSchedule | null>(null);
    const [soilMoisture, setSoilMoisture] = useState<SoilMoisturePrediction | null>(null);
    const [cropYield, setCropYield] = useState<CropYieldPrediction | null>(null);
    const [droughtFloodRisk, setDroughtFloodRisk] = useState<DroughtFloodRisk | null>(null);
    const [scenario, setScenario] = useState("a 2-degree temperature increase");
    const [scenarioResult, setScenarioResult] = useState<ScenarioAnalysis | null>(null);
    const [selectedCrop, setSelectedCrop] = useState("Corn");
    const [isContactOpen, setContactOpen] = useState(false);
    
    // Dialog state
    const [resultDialogOpen, setResultDialogOpen] = useState(false);
    const [currentResultType, setCurrentResultType] = useState<PredictionType | null>(null);

    type PredictionType = 'weather' | 'crops' | 'irrigation' | 'soil' | 'yield' | 'risk' | 'scenario';

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

    const handlePrediction = async (type: PredictionType) => {
        if (!lat || !lon) {
            toast({ title: t('predict.error.noCoords.title'), description: t('predict.error.noCoords.description'), variant: "destructive" });
            return;
        }
        setIsLoading(type);
        setCurrentResultType(type); // Set current type before fetch, though we open dialog on success

        const coords = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
        
        let result;
        let success = false;
        try {
            switch (type) {
                case 'weather':
                    result = await getWeatherReportAction(coords);
                    if (result.data) { setWeather(result.data); success = true; }
                    break;
                case 'crops':
                    result = await planCropsAction(coords);
                    if (result.data) { setCropPlan(result.data); success = true; }
                    break;
                case 'irrigation':
                    result = await scheduleIrrigationAction(coords);
                    if (result.data) { setIrrigationSchedule(result.data); success = true; }
                    break;
                case 'soil':
                    result = await predictSoilMoistureAction(coords);
                    if (result.data) { setSoilMoisture(result.data); success = true; }
                    break;
                case 'yield':
                    result = await predictCropYieldAction({ ...coords, cropType: selectedCrop });
                    if (result.data) { setCropYield(result.data); success = true; }
                    break;
                case 'risk':
                    result = await analyzeDroughtAndFloodRiskAction(coords);
                    if (result.data) { setDroughtFloodRisk(result.data); success = true; }
                    break;
                case 'scenario':
                    if (!scenario) {
                        toast({ title: t('predict.error.noScenario.title'), description: t('predict.error.noScenario.description'), variant: "destructive" });
                        result = { error: 'No scenario description' };
                        break;
                    }
                    result = await runScenarioAnalysisAction({ ...coords, scenarioDescription: scenario });
                    if (result.data) { setScenarioResult(result.data); success = true; }
                    break;
            }

            if (result?.error) {
                toast({ title: t('predict.error.predictionError.title'), description: result.error, variant: "destructive" });
            } else if (success) {
                setResultDialogOpen(true);
            }
        } catch (error) {
            toast({ title: t('predict.error.unexpected.title'), description: t('predict.error.unexpected.description'), variant: "destructive" });
        }

        setIsLoading(null);
    };

    const getRiskBadgeVariant = (riskLevel: 'Low' | 'Medium' | 'High') => {
        switch (riskLevel) {
            case 'Low': return 'default';
            case 'Medium': return 'secondary';
            case 'High': return 'destructive';
            default: return 'outline';
        }
    }

    const renderDialogContent = () => {
        if (!currentResultType) return null;

        switch (currentResultType) {
            case 'scenario':
                if (!scenarioResult) return null;
                return (
                    <div className="space-y-4">
                         <DialogHeader>
                            <DialogTitle>{t('predict.result.scenario.title')}</DialogTitle>
                            <DialogDescription>{scenarioResult.scenario}</DialogDescription>
                        </DialogHeader>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.scenario.impact')}</h4>
                            <p className="text-muted-foreground">{scenarioResult.likelyImpact}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.yield.confidence')}</h4>
                            <p className="text-muted-foreground">{(scenarioResult.confidence * 100).toFixed(0)}%</p>
                        </div>
                    </div>
                );
            case 'weather':
                 if (!weather) return null;
                 // WeatherReport is a Card, so we render it directly but simpler
                 return (
                     <div className="space-y-4">
                         <WeatherReport weather={weather} showForecast={true} />
                     </div>
                 );
            case 'risk':
                if (!droughtFloodRisk) return null;
                return (
                    <div className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>{t('predict.result.risk.title')}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                            <div>
                                <h4 className="font-semibold text-muted-foreground">{t('predict.result.risk.drought')}</h4>
                                <Badge variant={getRiskBadgeVariant(droughtFloodRisk.droughtRisk)} className="text-2xl mt-2">
                                    {droughtFloodRisk.droughtRisk}
                                </Badge>
                            </div>
                            <div>
                                <h4 className="font-semibold text-muted-foreground">{t('predict.result.risk.flood')}</h4>
                                <Badge variant={getRiskBadgeVariant(droughtFloodRisk.floodRisk)} className="text-2xl mt-2">
                                    {droughtFloodRisk.floodRisk}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.risk.summary')}</h4>
                            <p className="text-muted-foreground">{droughtFloodRisk.summary}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.yield.confidence')}</h4>
                            <p className="text-muted-foreground">{(droughtFloodRisk.confidence * 100).toFixed(0)}%</p>
                        </div>
                    </div>
                );
            case 'crops':
                if (!cropPlan) return null;
                return (
                    <div className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>{t('predict.result.cropPlan.title')}</DialogTitle>
                        </DialogHeader>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.cropPlan.plantingWindow')}</h4>
                            <p className="text-muted-foreground">{cropPlan.plantingWindow.start} to {cropPlan.plantingWindow.end}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.cropPlan.suitableCrops')}</h4>
                            <ul className="list-disc pl-5 mt-2 space-y-2">
                                {cropPlan.suitableCrops.map(crop => (
                                    <li key={crop.name}>
                                        <strong>{crop.name}:</strong> {crop.reason}
                                    </li>
                                ))}
                            </ul>
                        </div>
                            <div>
                            <h4 className="font-semibold">{t('predict.result.cropPlan.cooperativeFarming')}</h4>
                            <p className="text-muted-foreground">{cropPlan.cooperativeFarmingSuggestion}</p>
                        </div>
                    </div>
                );
            case 'irrigation':
                if (!irrigationSchedule) return null;
                return (
                    <div className="space-y-4">
                         <DialogHeader>
                            <DialogTitle>{t('predict.result.irrigation.title')}</DialogTitle>
                        </DialogHeader>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.irrigation.recommendation')}</h4>
                            <p className="text-2xl font-bold text-primary">{irrigationSchedule.recommendation}</p>

                        </div>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.irrigation.nextDate')}</h4>
                            <p className="text-muted-foreground">{new Date(irrigationSchedule.nextIrrigationDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

                        </div>
                            <div>
                            <h4 className="font-semibold">{t('predict.result.irrigation.wateringDepth')}</h4>
                            <p className="text-muted-foreground">{irrigationSchedule.wateringDepthInches} inches</p>
                        </div>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.irrigation.notes')}</h4>
                            <p className="text-muted-foreground">{irrigationSchedule.notes}</p>
                        </div>
                    </div>
                );
            case 'soil':
                if (!soilMoisture) return null;
                return (
                    <div className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>{t('predict.result.soil.title')}</DialogTitle>
                        </DialogHeader>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.soil.vwc')}</h4>
                            <p className="text-2xl font-bold text-primary">{soilMoisture.volumetricWaterContent.toFixed(1)}%</p>
                        </div>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.soil.summary')}</h4>
                            <p className="text-muted-foreground">{soilMoisture.summary}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.soil.confidence')}</h4>
                            <p className="text-muted-foreground">{(soilMoisture.confidence * 100).toFixed(0)}%</p>
                        </div>
                    </div>
                );
            case 'yield':
                if (!cropYield) return null;
                return (
                    <div className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>{t('predict.result.yield.title')}: {cropYield.crop}</DialogTitle>
                        </DialogHeader>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.yield.predictedYield')}</h4>
                            <p className="text-2xl font-bold text-primary">{cropYield.predictedYield.toFixed(2)} {t('predict.result.yield.unit')}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.yield.notes')}</h4>
                            <p className="text-muted-foreground">{cropYield.notes}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold">{t('predict.result.yield.confidence')}</h4>
                            <p className="text-muted-foreground">{(cropYield.confidence * 100).toFixed(0)}%</p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }


    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 p-4 md:p-6">
                <div className="container mx-auto space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('predict.title')}</CardTitle>
                            <CardDescription>
                                {t('predict.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="location-desc">{t('predict.locationDesc')}</Label>
                                <div className="flex gap-2">
                                <Input
                                    id="location-desc"
                                    placeholder={t('predict.locationDescPlaceholder')}
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="latitude">{t('predict.latitude')}</Label>
                                    <Input id="latitude" placeholder="e.g., 30.83" value={lat} onChange={(e) => setLat(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="longitude">{t('predict.longitude')}</Label>
                                    <Input id="longitude" placeholder="e.g., 31.07" value={lon} onChange={(e) => setLon(e.target.value)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><BrainCircuit/> {t('predict.scenario.title')}</CardTitle>
                                <CardDescription>{t('predict.scenario.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Textarea 
                                        placeholder={t('predict.scenario.placeholder')}
                                        value={scenario}
                                        onChange={(e) => setScenario(e.target.value)}
                                    />
                                    <Button onClick={() => handlePrediction('scenario')} disabled={!!isLoading}>
                                        {isLoading === 'scenario' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        {t('predict.scenario.button')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><BarChartBig/> {t('predict.yield.title')}</CardTitle>
                                <CardDescription>{t('predict.yield.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <div className="space-y-4">
                                   <Select value={selectedCrop} onValueChange={setSelectedCrop}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('cropAdvisor.advanced.selectCrop.placeholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cropOptions.map(crop => <SelectItem key={crop} value={crop}>{crop}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={() => handlePrediction('yield')} disabled={!!isLoading}>
                                        {isLoading === 'yield' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        {t('predict.yield.button')}
                                    </Button>
                                 </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Thermometer/> {t('predict.weather.title')}</CardTitle>
                                <CardDescription>{t('predict.weather.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => handlePrediction('weather')} disabled={!!isLoading}>
                                    {isLoading === 'weather' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    {t('predict.weather.button')}
                                </Button>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Tractor/> {t('predict.crop.title')}</CardTitle>
                                <CardDescription>{t('predict.crop.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => handlePrediction('crops')} disabled={!!isLoading}>
                                     {isLoading === 'crops' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    {t('predict.crop.button')}
                                </Button>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Droplets/> {t('predict.irrigation.title')}</CardTitle>
                                <CardDescription>{t('predict.irrigation.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => handlePrediction('irrigation')} disabled={!!isLoading}>
                                    {isLoading === 'irrigation' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    {t('predict.irrigation.button')}
                                </Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><LandPlot/> {t('predict.soil.title')}</CardTitle>
                                <CardDescription>{t('predict.soil.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => handlePrediction('soil')} disabled={!!isLoading}>
                                    {isLoading === 'soil' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    {t('predict.soil.button')}
                                </Button>
                            </CardContent>
                        </Card>
                       
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><AlertTriangle/> {t('predict.risk.title')}</CardTitle>
                                <CardDescription>{t('predict.risk.description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => handlePrediction('risk')} disabled={!!isLoading}>
                                    {isLoading === 'risk' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    {t('predict.risk.button')}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {isLoading && (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex justify-center items-center h-48">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </div>
            </main>
            
            <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                     <ScrollArea className="h-full w-full p-4">
                         {renderDialogContent()}
                     </ScrollArea>
                </DialogContent>
            </Dialog>

            <footer id="contact" className="py-6 w-full shrink-0 border-t">
                <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
                    <nav className="flex gap-4 sm:gap-6">
                        <Link href="/#about" className="text-xs hover:underline underline-offset-4 text-muted-foreground">{t('footer.about')}</Link>
                        <Link href="#contact" className="text-xs hover:underline underline-offset-4 text-muted-foreground" onClick={(e) => { e.preventDefault(); setContactOpen(true)}}>{t('footer.contact')}</Link>
                    </nav>
                    <p className="text-xs text-muted-foreground text-center">
                        {t('footer.copyright')}
                    </p>
                    <div className="w-24 hidden sm:block"></div> {/* Spacer to balance flexbox */}
                </div>
            </footer>
            <ContactSheet open={isContactOpen} onOpenChange={setContactOpen} />
        </div>
    );
}

