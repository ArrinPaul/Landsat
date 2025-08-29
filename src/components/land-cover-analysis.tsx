
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { LandCoverAnalysis as LandCoverAnalysisType } from "@/lib/types";
import { ArrowUp, ArrowDown, Leaf, Droplets, Building, HelpCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";


interface LandCoverAnalysisProps {
  landCover: LandCoverAnalysisType;
}

const ChangeCell = ({ value }: { value: number }) => {
  const isPositive = value >= 0;
  const icon = isPositive ? <ArrowUp className="h-4 w-4 text-green-500" /> : <ArrowDown className="h-4 w-4 text-red-500" />;
  
  return (
    <div className={`flex items-center justify-end gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {icon}
      <span>{value.toFixed(2)}%</span>
    </div>
  );
};

const rows = [
    { key: 'vegetation', label: 'Vegetation', icon: <Leaf className="h-5 w-5 text-green-500" /> },
    { key: 'water', label: 'Water', icon: <Droplets className="h-5 w-5 text-blue-500" /> },
    { key: 'builtUp', label: 'Built-up', icon: <Building className="h-5 w-5 text-gray-500" /> },
    { key: 'other', label: 'Other', icon: <HelpCircle className="h-5 w-5 text-orange-500" /> },
] as const;


export function LandCoverAnalysis({ landCover }: LandCoverAnalysisProps) {
  
  const chartData = rows.map(row => ({
    name: row.label,
    startArea: landCover[row.key].startArea,
    endArea: landCover[row.key].endArea,
  }));

  const chartConfig = {
    startArea: {
      label: "Start Area",
      color: "hsl(var(--secondary))",
    },
    endArea: {
      label: "End Area",
      color: "hsl(var(--primary))",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Land Cover Change Analysis</CardTitle>
        <CardDescription>Area statistics and visualization for different land cover types at the start and end of the selected period.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col justify-center">
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Land Cover Class</TableHead>
                      <TableHead className="text-right">Start Area (km²)</TableHead>
                      <TableHead className="text-right">End Area (km²)</TableHead>
                      <TableHead className="text-right">Change (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(row => {
                        const data = landCover[row.key];
                        return (
                            <TableRow key={row.key}>
                                <TableCell className="font-medium flex items-center gap-2">
                                   {row.icon} {row.label}
                                </TableCell>
                                <TableCell className="text-right">{data.startArea.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{data.endArea.toFixed(2)}</TableCell>
                                <TableCell className="text-right"><ChangeCell value={data.percentageChange} /></TableCell>
                            </TableRow>
                        )
                    })}
                  </TableBody>
                </Table>
            </div>
            <div className="min-h-[300px]">
                <ChartContainer config={chartConfig} className="h-full w-full">
                    <BarChart data={chartData} accessibilityLayer>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="name"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                        />
                        <YAxis 
                            tickFormatter={(value) => `${value} km²`}
                        />
                         <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                         />
                        <Legend />
                        <Bar dataKey="startArea" fill="var(--color-startArea)" radius={4} />
                        <Bar dataKey="endArea" fill="var(--color-endArea)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
