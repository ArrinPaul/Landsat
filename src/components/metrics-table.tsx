
"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ArrowUpDown,
  FileText,
  Download,
  Wand2,
  Loader2,
  Leaf,
  Droplets,
  Building,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateInsightAction, generateReportAction } from "@/lib/actions";
import { generateCsv, downloadFile } from "@/lib/csv";
import type { AnalysisResult, MetricData } from '@/lib/types';


type TableRowData = {
    name: string;
    type: 'index' | 'landcover';
    firstValue: number | null;
    lastValue: number | null;
    percentageChange: number | null;
    n: number | null;
    insight?: string;
    icon?: React.ReactNode;
};

type SortKey = keyof TableRowData | '';
type SortDirection = 'asc' | 'desc';

interface MetricsTableProps {
  analysisResult: AnalysisResult;
  location: string;
  dateRange: string;
}

export function MetricsTable({ analysisResult, location, dateRange }: MetricsTableProps) {
  const { toast } = useToast();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [insightLoading, setInsightLoading] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  
  const [tableData, setTableData] = useState<TableRowData[]>(() => {
    const timeSeriesMetrics: TableRowData[] = Object.entries(analysisResult.timeSeries).map(([name, ts]) => {
      const validPoints = ts.filter(d => d.value !== null && !isNaN(d.value));
      const firstValue = validPoints.length > 0 ? validPoints[0].value : null;
      const lastValue = validPoints.length > 0 ? validPoints[validPoints.length - 1].value : null;
      let percentageChange: number | null = null;
      if (firstValue !== null && lastValue !== null && firstValue !== 0) {
        percentageChange = ((lastValue - firstValue) / Math.abs(firstValue)) * 100;
      }
      return {
        name,
        type: 'index',
        firstValue,
        lastValue,
        percentageChange,
        n: validPoints.length
      };
    });

    const landCoverMetrics: TableRowData[] = [
      { name: 'Vegetation', key: 'vegetation', icon: <Leaf className="h-5 w-5 text-green-500" /> },
      { name: 'Water', key: 'water', icon: <Droplets className="h-5 w-5 text-blue-500" /> },
      { name: 'Built-up', key: 'builtUp', icon: <Building className="h-5 w-5 text-gray-500" /> },
      { name: 'Other', key: 'other', icon: <HelpCircle className="h-5 w-5 text-orange-500" /> },
    ].map(item => {
        const data = analysisResult.landCover[item.key as keyof typeof analysisResult.landCover];
        return {
            name: item.name,
            type: 'landcover',
            firstValue: data.startArea,
            lastValue: data.endArea,
            percentageChange: data.percentageChange,
            n: null,
            icon: item.icon,
        }
    });

    return [...timeSeriesMetrics, ...landCoverMetrics];
  });
  
  const sortedMetrics = useMemo(() => {
    if (!sortKey) return tableData;
    return [...tableData].sort((a, b) => {
      const aVal = a[sortKey as keyof TableRowData];
      const bVal = b[sortKey as keyof TableRowData];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tableData, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getInsight = async (metricName: string) => {
    if (insightLoading) return;
    setInsightLoading(metricName);
    
    const metric = tableData.find(m => m.name === metricName);
    if (metric) {
      const result = await generateInsightAction({
          metricName: metric.name,
          firstValue: metric.firstValue,
          lastValue: metric.lastValue,
          percentageChange: metric.percentageChange,
          numberOfValidPoints: metric.n ?? 0,
      });

      if (result.error) {
        toast({ title: "AI Error", description: result.error, variant: "destructive" });
      } else if (result.data) {
        setTableData(prevData => prevData.map(m => m.name === metricName ? { ...m, insight: result.data } : m));
      }
    }
    setInsightLoading(null);
  };
  
  const handleExportCsv = () => {
    // This needs to be adapted to handle the new unified data structure
    const metricsToExport: MetricData[] = tableData.map(row => ({
        name: row.name,
        firstValue: row.firstValue,
        lastValue: row.lastValue,
        percentageChange: row.percentageChange,
        n: row.n ?? 0,
        timeSeries: [], // Not needed for this CSV
    }));
    const csvData = generateCsv(metricsToExport);
    downloadFile(csvData, 'earth-insights-metrics.csv', 'text/csv');
    toast({ title: 'Success', description: 'Metrics exported to CSV.' });
  }

  const handleExportReport = async () => {
    setReportLoading(true);
    const metricsForReport = tableData.map(d => ({
        name: d.name,
        type: d.type,
        firstValue: d.firstValue,
        lastValue: d.lastValue,
        percentageChange: d.percentageChange,
        points: d.n,
        unit: d.type === 'landcover' ? 'km²' : 'index value'
    }));

    const result = await generateReportAction(metricsForReport, location, dateRange);
    setReportLoading(false);
    if (result.error) {
      toast({ title: 'Report Generation Error', description: result.error, variant: 'destructive' });
    } else if (result.data) {
      downloadFile(result.data, 'summary-report.txt', 'text/plain');
      toast({ title: 'Success', description: 'Summary report generated and downloaded.' });
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortDirection === 'asc' ? '▲' : '▼';
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Computed Metrics</CardTitle>
            <CardDescription>Detailed metrics including spectral indices and land cover statistics.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCsv}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
            <Button variant="outline" onClick={handleExportReport} disabled={reportLoading}>
              {reportLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Summary Report
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                <div className="flex items-center">Metric {renderSortIcon('name')}</div>
              </TableHead>
              <TableHead onClick={() => handleSort('firstValue')} className="cursor-pointer text-right">
                <div className="flex items-center justify-end">Start Value / Area (km²) {renderSortIcon('firstValue')}</div>
              </TableHead>
              <TableHead onClick={() => handleSort('lastValue')} className="cursor-pointer text-right">
                <div className="flex items-center justify-end">End Value / Area (km²) {renderSortIcon('lastValue')}</div>
              </TableHead>
              <TableHead onClick={() => handleSort('percentageChange')} className="cursor-pointer text-right">
                <div className="flex items-center justify-end">Change (%) {renderSortIcon('percentageChange')}</div>
              </TableHead>
              <TableHead onClick={() => handleSort('n')} className="cursor-pointer text-right">
                 <div className="flex items-center justify-end">Points (n) {renderSortIcon('n')}</div>
              </TableHead>
              <TableHead className="text-center">AI Insight</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMetrics.map((metric) => (
              <TableRow key={metric.name}>
                <TableCell className="font-medium flex items-center gap-2">{metric.icon}{metric.name}</TableCell>
                <TableCell className="text-right">{metric.firstValue?.toFixed(4) ?? 'N/A'}</TableCell>
                <TableCell className="text-right">{metric.lastValue?.toFixed(4) ?? 'N/A'}</TableCell>
                <TableCell className={`text-right ${metric.percentageChange === null ? '' : metric.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.percentageChange?.toFixed(2) ?? 'N/A'}
                </TableCell>
                <TableCell className="text-right">{metric.n ?? 'N/A'}</TableCell>
                <TableCell className="text-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => !metric.insight && getInsight(metric.name)} disabled={!!insightLoading}>
                          {insightLoading === metric.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        {insightLoading === metric.name ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : (
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">AI Insight for {metric.name}</h4>
                              <p className="text-sm text-muted-foreground">{metric.insight || "Click the wand to generate an AI insight for this metric."}</p>
                            </div>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
