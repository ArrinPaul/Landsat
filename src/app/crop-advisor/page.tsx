
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, Loader2, Wheat, Droplets, LandPlot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { suggestCropAction } from "@/lib/actions";
import type { SuggestCropOutput } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";

function CropAdvisorContent() {
    const { toast } = useToast();
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<SuggestCropOutput | null>(null);

    const [lat, setLat] = useState("28.6139");
    const [lon, setLon] = useState("77.2090");
    const [climate, setClimate] = useState("Subtropical, with a hot summer and a cool, dry winter.");
    const [currentCrop, setCurrentCrop] = useState("Wheat");

    useEffect(() => {
        const latParam = searchParams.get('lat');
        const lonParam = searchParams.get('lon');
        if (latParam) {
            setLat(latParam);
        }
        if (lonParam) {
            setLon(lonParam);
        }
    }, [searchParams]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setResult(null);

        const formData = {
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            climateDescription: climate,
            currentCrop,
        };

        const response = await suggestCropAction(formData);
        
        if (response.error) {
            toast({ title: t('predict.error.aiError.title'), description: response.error, variant: "destructive" });
        } else if (response.data) {
            setResult(response.data);
            toast({ title: t('cropAdvisor.toast.success.title'), description: t('cropAdvisor.toast.success.description') });
        }
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 p-4 md:p-6">
                <div className="container mx-auto space-y-8 max-w-4xl">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('cropAdvisor.title')}</CardTitle>
                            <CardDescription>{t('cropAdvisor.description')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="latitude">{t('predict.latitude')}</Label>
                                        <Input id="latitude" value={lat} onChange={e => setLat(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="longitude">{t('predict.longitude')}</Label>
                                        <Input id="longitude" value={lon} onChange={e => setLon(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="current-crop">{t('cropAdvisor.currentCrop.label')}</Label>
                                    <Input id="current-crop" placeholder={t('cropAdvisor.currentCrop.placeholder')} value={currentCrop} onChange={e => setCurrentCrop(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="climate">{t('cropAdvisor.climate.label')}</Label>
                                    <Textarea id="climate" placeholder={t('cropAdvisor.climate.placeholder')} value={climate} onChange={e => setClimate(e.target.value)} required />
                                </div>
                                <Button type="submit" disabled={isLoading} className="w-full">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wheat className="mr-2" />}
                                    {t('cropAdvisor.button.getRecommendation')}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {isLoading && (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    )}

                    {result && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('cropAdvisor.result.title')}</CardTitle>
                                <CardDescription>{t('cropAdvisor.result.description')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <Card className="p-4">
                                        <CardDescription className="flex items-center gap-2 mb-2"><LandPlot /> {t('cropAdvisor.result.soilType')}</CardDescription>
                                        <Badge variant="outline" className="text-lg">{result.fetchedSoilType}</Badge>
                                    </Card>
                                     <Card className="p-4">
                                        <CardDescription className="flex items-center gap-2 mb-2"><Droplets /> {t('cropAdvisor.result.moisture')}</CardDescription>
                                        <Badge variant="outline" className="text-lg">{result.fetchedMoistureLevel}</Badge>
                                    </Card>
                                </div>

                                <div className="text-center space-y-2 pt-4">
                                    <p className="text-muted-foreground">{t('cropAdvisor.result.suggestedCrop')}</p>
                                    <h3 className="text-4xl font-bold text-primary">{result.suggestedCrop}</h3>
                                </div>
                                <div className="text-center space-y-2">
                                     <p className="text-muted-foreground">{t('cropAdvisor.result.suitability')}</p>
                                      <div className="relative h-8 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="absolute top-0 left-0 h-full bg-green-500 rounded-full" style={{ width: `${result.suitabilityScore}%` }} />
                                        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white mix-blend-difference">{result.suitabilityScore}% {t('cropAdvisor.result.suitable')}</span>
                                    </div>
                                </div>
                                
                                <Alert>
                                    <Lightbulb className="h-4 w-4" />
                                    <AlertTitle>{t('cropAdvisor.result.reasoning')}</AlertTitle>
                                    <AlertDescription>
                                       {result.reasoning}
                                    </AlertDescription>
                                </Alert>

                                {result.alternativeCrop && (
                                     <Alert variant="default">
                                        <Wheat className="h-4 w-4" />
                                        <AlertTitle>{t('cropAdvisor.result.alternative')}</AlertTitle>
                                        <AlertDescription>
                                          {t('cropAdvisor.result.alternativeDesc', { crop: result.alternativeCrop })}
                                        </AlertDescription>
                                    </Alert>
                                )}

                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function CropAdvisorPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CropAdvisorContent />
        </Suspense>
    )
}

    