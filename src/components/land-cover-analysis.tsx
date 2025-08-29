
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Land Cover Change Analysis</CardTitle>
        <CardDescription>Area statistics for different land cover types at the start and end of the selected period.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Land Cover Class</TableHead>
              <TableHead className="text-right">Start Area (km²)</TableHead>
              <TableHead className="text-right">End Area (km²)</TableHead>
              <TableHead className="text-right">Absolute Change (km²)</TableHead>
              <TableHead className="text-right">Percentage Change (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => {
                const data = landCover[row.key];
                const isPositive = data.absoluteChange >= 0;
                return (
                    <TableRow key={row.key}>
                        <TableCell className="font-medium flex items-center gap-2">
                           {row.icon} {row.label}
                        </TableCell>
                        <TableCell className="text-right">{data.startArea.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{data.endArea.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{data.absoluteChange.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right"><ChangeCell value={data.percentageChange} /></TableCell>
                    </TableRow>
                )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
