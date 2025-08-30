
"use client";

import React, { useRef, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Label, Brush
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AnalysisResult, GroundTruthDataPoint } from '@/lib/types';
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

function combineAndSortData(analysisResult: AnalysisResult, groundTruth: GroundTruthDataPoint[] | null) {
    if (!groundTruth) return [];

    const satelliteDataMap = new Map(analysisResult.timeSeries.NDVI.map(d => [format(new Date(d.date), 'yyyy-MM-dd'), d.value]));

    return groundTruth
        .map((gt) => {
            const dateStr = format(new Date(gt.date), 'yyyy-MM-dd');
            const satelliteValue = satelliteDataMap.get(dateStr);
            if (satelliteValue !== undefined && satelliteValue !== null && !isNaN(gt.value)) {
                return {
                    ground: gt.value,
                    satellite: satelliteValue,
                };
            }
            return null;
        })
        .filter((d): d is { ground: number, satellite: number } => d !== null);
}


interface VisualizationsProps {
  analysisResult: AnalysisResult;
  groundTruthData: GroundTruthDataPoint[] | null;
  selectedMetric: string;
  setSelectedMetric: (metric: string) => void;
}

const metricOrder = [
    'NDVI', 'NDWI', 'NDBI', 'NBR',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B11', 'B12',
];

export function Visualizations({ analysisResult, groundTruthData, selectedMetric, setSelectedMetric }: VisualizationsProps) {
  const chartRef = useRef(null);
  const scatterRef = useRef(null);
  const [brushStartIndex, setBrushStartIndex] = useState<number | undefined>();
  const [brushEndIndex, setBrushEndIndex] = useState<number | undefined>();

  const metricNames = Object.keys(analysisResult.timeSeries).sort((a,b) => {
      const indexA = metricOrder.indexOf(a);
      const indexB = metricOrder.indexOf(b);
      if(indexA === -1) return 1;
      if(indexB === -1) return -1;
      return indexA - indexB;
  });
  
  const metric = analysisResult.timeSeries[selectedMetric as keyof typeof analysisResult.timeSeries];
  const comparisonData = combineAndSortData(analysisResult, groundTruthData);
  
  const handleBrushChange = (range: any) => {
    setBrushStartIndex(range.startIndex);
    setBrushEndIndex(range.endIndex);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Visualization</CardTitle>
        <CardDescription>Interactive plots of environmental metrics and spectral bands.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="time-series">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="time-series">Time-Series Analysis</TabsTrigger>
            <TabsTrigger value="comparison" disabled={!groundTruthData}>
                Satellite vs. Ground
                {!groundTruthData && <span className="text-xs ml-2">(CSV required)</span>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="time-series" className="mt-4">
            <div className="flex justify-end mb-4">
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select a metric or band" />
                    </SelectTrigger>
                    <SelectContent>
                        {metricNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {metric && (
              <div ref={chartRef} className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metric} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(str) => format(new Date(str), 'MMM yy')}
                        minTickGap={30}
                    />
                    <YAxis domain={['auto', 'auto']} tickFormatter={(val) => typeof val === 'number' ? val.toFixed(2) : val} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="value" name={selectedMetric} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
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
                        <Scatter name="Comparison" data={comparisonData} fill="hsl(var(--primary))" />
                    </ScatterChart>
                 </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
