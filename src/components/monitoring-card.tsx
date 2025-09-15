
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';

export function MonitoringCard() {
    const { toast } = useToast();
    const { t } = useLanguage();
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [threshold, setThreshold] = useState(20);

    const handleSave = () => {
        toast({
            title: isMonitoring ? t('dashboard.monitoring.alert.enabled.title') : t('dashboard.monitoring.alert.disabled.title'),
            description: isMonitoring ? t('dashboard.monitoring.alert.enabled.description', { threshold: threshold.toString() }) : t('dashboard.monitoring.alert.disabled.description'),
        });
    }

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    <CardTitle className="text-xl">{t('dashboard.monitoring.title')}</CardTitle>
                </div>
                <CardDescription>{t('dashboard.monitoring.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="monitoring-switch" className="flex-grow">{t('dashboard.monitoring.toggle')}</Label>
                    <Switch
                        id="monitoring-switch"
                        checked={isMonitoring}
                        onCheckedChange={setIsMonitoring}
                    />
                </div>
                {isMonitoring && (
                    <div className="space-y-2">
                        <Label htmlFor="threshold">{t('dashboard.monitoring.threshold.label')}</Label>
                        <div className="relative">
                            <Input
                                id="threshold"
                                type="number"
                                value={threshold}
                                onChange={(e) => setThreshold(Number(e.target.value))}
                                className="pr-8"
                            />
                            <span className="absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">%</span>
                        </div>
                         <p className="text-xs text-muted-foreground">{t('dashboard.monitoring.threshold.description')}</p>
                    </div>
                )}
                 <Button onClick={handleSave} className="w-full">
                    {t('dashboard.monitoring.save')}
                </Button>
            </CardContent>
        </Card>
    );
}
