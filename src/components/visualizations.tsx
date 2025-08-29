
"use client";

import React, { useRef, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Label, Brush
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MetricData } from '@/lib/types';
import { format } from 'date-fns';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const formattedLabel = format(new Date(label), 'MMM d, yyyy');
    return (
      <div className="bg-background/80 backdrop-blur-sm p-2 border border-border rounded-md shadow-lg">
        <p className="label font-bold">{`${formattedLabel}`}</p>
        {payload.map((pld: any, index: number) => (
           <p key={index} style={{ color: pld.color }}>{`${pld.name}: ${pld.value.toFixed(4)}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

function combineAndSortData(metric: MetricData) {
    if (!metric.groundTruth) return [];

    const satelliteDataMap = new Map(metric.timeSeries.map(d => [format(new Date(d.date), 'yyyy-MM-dd'), d.value]));

    return metric.groundTruth
        .map(gt => {
            const dateStr = format(new Date(gt.date), 'yyyy-MM-dd');
            const satelliteValue = satelliteDataMap.get(dateStr);
            if (satelliteValue !== undefined) {
                return {
                    ground: gt.value,
                    satellite: satelliteValue,
                };
            }
            return null;
        })
        .filter(d => d !== null);
}


interface VisualizationsProps {
  metrics: MetricData[];
  selectedMetric: string;
  setSelectedMetric: (metric: string) => void;
}

export function Visualizations({ metrics, selectedMetric, setSelectedMetric }: VisualizationsProps) {
  const chartRef = useRef(null);
  const scatterRef = useRef(null);
  const [brushStartIndex, setBrushStartIndex] = useState<number | undefined>();
  const [brushEndIndex, setBrushEndIndex] = useState<number | undefined>();

  const metric = metrics.find(m => m.name === selectedMetric);
  const ndviMetric = metrics.find(m => m.name === 'NDVI');
  const comparisonData = ndviMetric ? combineAndSortData(ndviMetric) : [];

  const handleBrushChange = (range: any) => {
    setBrushStartIndex(range.startIndex);
    setBrushEndIndex(range.endIndex);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Visualization</CardTitle>
        <CardDescription>Interactive plots of environmental metrics.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="time-series">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="time-series">Time-Series Plots</TabsTrigger>
            <TabsTrigger value="comparison" disabled={!ndviMetric?.groundTruth}>
                Satellite vs. Ground
                {!ndviMetric?.groundTruth && <span className="text-xs ml-2">(CSV required)</span>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="time-series" className="mt-4">
            <div className="flex justify-end mb-4">
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select a metric" />
                    </SelectTrigger>
                    <SelectContent>
                        {metrics.map(m => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {metric && (
              <div ref={chartRef} className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metric.timeSeries} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(str) => format(new Date(str), 'MMM yy')}
                        minTickGap={30}
                    />
                    <YAxis domain={['auto', 'auto']} tickFormatter={(val) => typeof val === 'number' ? val.toFixed(2) : val} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="value" name={metric.name} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                     <Brush 
                        dataKey="date" 
                        height={30} 
                        stroke="hsl(var(--primary))"
                        tickFormatter={(str) => format(new Date(str), 'MMM d')}
                        startIndex={brushStartIndex}
                        endIndex={brushEndIndex}
                        onChange={handleBrushChange}
                     />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
          <TabsContent value="comparison" className="mt-4">
            <CardDescription className="text-center mb-2">Comparison of Satellite NDVI vs. Ground Truth Data</CardDescription>
             <div ref={scatterRef} className="h-[400px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="ground" name="Ground Truth">
                           <Label value="Ground Truth Value" offset={-25} position="insideBottom" />
                        </XAxis>
                        <YAxis type="number" dataKey="satellite" name="Satellite Value">
                             <Label value="Satellite Value" angle={-90} offset={-10} position="insideLeft" style={{ textAnchor: 'middle' }} />
                        </YAxis>
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend verticalAlign="top" height={36}/>
                        <Scatter name="Comparison" data={comparisonData as any[]} fill="hsl(var(--primary))" />
                    </ScatterChart>
                 </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
