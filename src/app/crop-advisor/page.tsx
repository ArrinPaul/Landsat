
"use client";

import React, { useState } from "react";
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

export default function CropAdvisorPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<SuggestCropOutput | null>(null);

    const [lat, setLat] = useState("28.6139");
    const [lon, setLon] = useState("77.2090");
    const [climate, setClimate] = useState("Subtropical, with a hot summer and a cool, dry winter.");
    const [currentCrop, setCurrentCrop] = useState("Wheat");


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
            toast({ title: "Error", description: response.error, variant: "destructive" });
        } else if (response.data) {
            setResult(response.data);
            toast({ title: "Recommendation Generated", description: "Your crop recommendation is ready." });
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
                            <CardTitle>AI Crop Advisor</CardTitle>
                            <CardDescription>
                                Fill in your farm's location and climate to get a data-driven crop recommendation. Soil and moisture data will be fetched automatically.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="latitude">Latitude</Label>
                                        <Input id="latitude" value={lat} onChange={e => setLat(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="longitude">Longitude</Label>
                                        <Input id="longitude" value={lon} onChange={e => setLon(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="current-crop">Current or Previous Crop (Optional)</Label>
                                    <Input id="current-crop" placeholder="e.g., Corn, Fallow" value={currentCrop} onChange={e => setCurrentCrop(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="climate">Local Climate Description</Label>
                                    <Textarea id="climate" placeholder="Describe the typical weather, e.g., 'Temperate with four seasons'" value={climate} onChange={e => setClimate(e.target.value)} required />
                                </div>
                                <Button type="submit" disabled={isLoading} className="w-full">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wheat className="mr-2" />}
                                    Get Recommendation
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
                                <CardTitle>AI Recommendation</CardTitle>
                                <CardDescription>Based on your input and real-time satellite data, here is our suggestion.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <Card className="p-4">
                                        <CardDescription className="flex items-center gap-2 mb-2"><LandPlot /> Fetched Soil Type</CardDescription>
                                        <Badge variant="outline" className="text-lg">{result.fetchedSoilType}</Badge>
                                    </Card>
                                     <Card className="p-4">
                                        <CardDescription className="flex items-center gap-2 mb-2"><Droplets /> Fetched Moisture</CardDescription>
                                        <Badge variant="outline" className="text-lg">{result.fetchedMoistureLevel}</Badge>
                                    </Card>
                                </div>

                                <div className="text-center space-y-2 pt-4">
                                    <p className="text-muted-foreground">Suggested Crop</p>
                                    <h3 className="text-4xl font-bold text-primary">{result.suggestedCrop}</h3>
                                </div>
                                <div className="text-center space-y-2">
                                     <p className="text-muted-foreground">Suitability Score</p>
                                      <div className="relative h-8 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="absolute top-0 left-0 h-full bg-green-500 rounded-full" style={{ width: `${result.suitabilityScore}%` }} />
                                        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white mix-blend-difference">{result.suitabilityScore}% Suitable</span>
                                    </div>
                                </div>
                                
                                <Alert>
                                    <Lightbulb className="h-4 w-4" />
                                    <AlertTitle>Reasoning</AlertTitle>
                                    <AlertDescription>
                                       {result.reasoning}
                                    </AlertDescription>
                                </Alert>

                                {result.alternativeCrop && (
                                     <Alert variant="default">
                                        <Wheat className="h-4 w-4" />
                                        <AlertTitle>Alternative Suggestion</AlertTitle>
                                        <AlertDescription>
                                          Another good option for your conditions could be <strong>{result.alternativeCrop}</strong>.
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
