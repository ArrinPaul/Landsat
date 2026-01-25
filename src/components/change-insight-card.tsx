
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, CheckCircle, AlertTriangle, AlertCircle, XCircle } from "lucide-react";
import { AnalyzeChangeOutput } from "@/ai/flows/analyze-change";
import React from "react";

interface ChangeInsightCardProps {
  changeAnalysis: AnalyzeChangeOutput;
}

export function ChangeInsightCard({ changeAnalysis }: ChangeInsightCardProps) {
  const { changeClassification, confidenceScore, explanation, recommendedAction } = changeAnalysis;

  let dynamicBorderColor: string;
  let dynamicHeaderBgColor: string;
  let dynamicIconColor: string;
  let IconComponent: React.ElementType;

  switch (changeClassification) {
    case 'Normal':
      dynamicBorderColor = 'border-green-500';
      dynamicHeaderBgColor = 'bg-green-50';
      dynamicIconColor = 'text-green-600';
      IconComponent = CheckCircle;
      break;
    case 'Transitional':
      dynamicBorderColor = 'border-yellow-500';
      dynamicHeaderBgColor = 'bg-yellow-50';
      dynamicIconColor = 'text-yellow-600';
      IconComponent = AlertTriangle;
      break;
    case 'Concerning':
      dynamicBorderColor = 'border-orange-500';
      dynamicHeaderBgColor = 'bg-orange-50';
      dynamicIconColor = 'text-orange-600';
      IconComponent = AlertCircle;
      break;
    case 'Critical':
      dynamicBorderColor = 'border-red-500';
      dynamicHeaderBgColor = 'bg-red-50';
      dynamicIconColor = 'text-red-600';
      IconComponent = XCircle;
      break;
    default:
      dynamicBorderColor = 'border-gray-300';
      dynamicHeaderBgColor = 'bg-gray-50';
      dynamicIconColor = 'text-gray-600';
      IconComponent = Lightbulb; // Default icon
  }

  return (
    <Card className={`border-[2px] transition-colors duration-300 ${dynamicBorderColor}`}>
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${dynamicHeaderBgColor}`}>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <IconComponent className={`h-4 w-4 ${dynamicIconColor}`} />
          {changeClassification}
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          Confidence: {(confidenceScore * 100).toFixed(0)}%
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground mb-3">
          {explanation}
        </p>
        <div className="flex items-center text-xs text-primary">
          <Lightbulb className="h-4 w-4 mr-1" />
          <span className="font-semibold">Recommended Action:</span> {recommendedAction}
        </div>
      </CardContent>
    </Card>
  );
}
