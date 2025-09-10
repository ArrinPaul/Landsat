
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { addDays } from "date-fns";
import { MapPin } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

interface PointOfInterest {
    name: string;
    description: string;
    image: string;
    lat: string;
    lon: string;
    dateRange: { from: Date; to: Date };
    "data-ai-hint": string;
}

interface PointsOfInterestProps {
    onSelect: (poi: PointOfInterest) => void;
}

export function PointsOfInterest({ onSelect }: PointsOfInterestProps) {
    const { t } = useLanguage();
    const pointsOfInterest: PointOfInterest[] = [
        {
            name: t('dashboard.poi.amazon.name'),
            description: t('dashboard.poi.amazon.description'),
            image: "https://picsum.photos/seed/amazon/600/400",
            lat: "-3.4653",
            lon: "-62.2159",
            dateRange: { from: addDays(new Date(), -730), to: new Date() },
            "data-ai-hint": "rainforest jungle",
        },
        {
            name: t('dashboard.poi.sahara.name'),
            description: t('dashboard.poi.sahara.description'),
            image: "https://picsum.photos/seed/sahara/600/400",
            lat: "23.4162",
            lon: "25.6628",
            dateRange: { from: addDays(new Date(), -365 * 5), to: new Date() },
            "data-ai-hint": "desert dunes",
        },
        {
            name: t('dashboard.poi.nile.name'),
            description: t('dashboard.poi.nile.description'),
            image: "https://picsum.photos/seed/nile/600/400",
            lat: "30.83",
            lon: "31.07",
            dateRange: { from: addDays(new Date(), -365 * 10), to: new Date() },
            "data-ai-hint": "river delta",
        },
         {
            name: t('dashboard.poi.himalayas.name'),
            description: t('dashboard.poi.himalayas.description'),
            image: "https://picsum.photos/seed/himalayas/600/400",
            lat: "27.9881",
            lon: "86.9250",
            dateRange: { from: addDays(new Date(), -365 * 2), to: new Date() },
            "data-ai-hint": "snowy mountains",
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('dashboard.poi.title')}</CardTitle>
                <CardDescription>{t('dashboard.poi.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {pointsOfInterest.map(poi => (
                        <Card key={poi.name} className="overflow-hidden flex flex-col">
                            <div className="relative h-48 w-full">
                                <Image
                                    src={poi.image}
                                    alt={`Image of ${poi.name}`}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    data-ai-hint={poi['data-ai-hint']}
                                />
                            </div>
                            <CardHeader>
                                <CardTitle>{poi.name}</CardTitle>
                                <CardDescription className="h-10">{poi.description}</CardDescription>
                            </CardHeader>
                            <CardFooter className="mt-auto">
                                <Button onClick={() => onSelect(poi)} className="w-full">
                                    <MapPin className="mr-2 h-4 w-4" />
                                    {t('dashboard.poi.analyze')}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
