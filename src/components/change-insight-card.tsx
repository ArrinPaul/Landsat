"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalyzeChangeOutput } from "@/ai/flows/analyze-change";
import { CheckCircle, Activity, AlertTriangle, AlertOctagon, BrainCircuit, Sparkles, Lightbulb } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

interface ChangeInsightCardProps {
  changeAnalysis: AnalyzeChangeOutput;
}

export function ChangeInsightCard({ changeAnalysis }: ChangeInsightCardProps) {
  const { t } = useLanguage();

  const { classification, confidenceScore, explanation, recommendedAction } = changeAnalysis;

  // Determine styles and icon based on classification
  let variantStyles = "";
  let Icon = BrainCircuit;
  let badgeClasses = "";
  let iconColor = "";

  switch (classification) {
    case "Normal":
      variantStyles = "bg-gradient-to-br from-green-50 to-emerald-50/30 border-green-200 shadow-green-100 dark:from-green-950/40 dark:to-emerald-950/20 dark:border-green-900";
      Icon = CheckCircle;
      badgeClasses = "bg-green-100 text-green-700 hover:bg-green-100 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800";
      iconColor = "text-green-600 dark:text-green-400";
      break;
    case "Transitional":
      variantStyles = "bg-gradient-to-br from-yellow-50 to-amber-50/30 border-yellow-200 shadow-yellow-100 dark:from-yellow-950/40 dark:to-amber-950/20 dark:border-yellow-900";
      Icon = Activity;
      badgeClasses = "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800";
      iconColor = "text-yellow-600 dark:text-yellow-400";
      break;
    case "Concerning":
      variantStyles = "bg-gradient-to-br from-orange-50 to-amber-50/30 border-orange-200 shadow-orange-100 dark:from-orange-950/40 dark:to-amber-950/20 dark:border-orange-900";
      Icon = AlertTriangle;
      badgeClasses = "bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800";
      iconColor = "text-orange-600 dark:text-orange-400";
      break;
    case "Critical":
      variantStyles = "bg-gradient-to-br from-red-50 to-rose-50/30 border-red-200 shadow-red-100 dark:from-red-950/40 dark:to-rose-950/20 dark:border-red-900";
      Icon = AlertOctagon;
      badgeClasses = "bg-red-100 text-red-700 hover:bg-red-100 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800";
      iconColor = "text-red-600 dark:text-red-400";
      break;
    default:
      variantStyles = "bg-gradient-to-br from-blue-50 to-indigo-50/30 border-blue-200 shadow-blue-100 dark:from-blue-950/40 dark:to-indigo-950/20 dark:border-blue-900";
      Icon = Sparkles;
      badgeClasses = "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800";
      iconColor = "text-blue-600 dark:text-blue-400";
      break;
  }

  // Convert confidence to percentage
  const confidencePercent = Math.round(confidenceScore * 100);

  return (
    <Card className={`mb-6 border-t-4 shadow-md overflow-hidden ${variantStyles}`}>
      <CardHeader className="pb-3 border-b bg-white/40 dark:bg-black/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-md bg-white dark:bg-black/40 shadow-sm border ${iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-semibold tracking-tight">{t('dashboard.insight.title')}</CardTitle>
          </div>
          <Badge className={`text-sm px-3 py-1 font-semibold ${badgeClasses}`}>
            {t(`dashboard.insight.classification.${classification}`)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        <div className="relative">
          <Sparkles className={`absolute -top-3 -left-3 h-8 w-8 opacity-10 ${iconColor}`} />
          <p className="text-[1.05rem] leading-relaxed text-slate-800 dark:text-slate-200 font-medium z-10 relative">
            {explanation}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Recommended Action */}
          <div className="p-4 rounded-xl bg-white/60 dark:bg-black/30 border shadow-sm backdrop-blur-md transition-all hover:shadow-md">
            <h4 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              {t('dashboard.insight.action')}
            </h4>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{recommendedAction}</p>
          </div>

          {/* Confidence Score */}
          <div className="flex flex-col justify-center p-4 rounded-xl bg-white/60 dark:bg-black/30 border shadow-sm backdrop-blur-md">
            <div className="flex justify-between mb-3 items-end">
              <span className="font-semibold text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <BrainCircuit className="h-3.5 w-3.5 text-blue-500" />
                {t('dashboard.insight.confidence')}
              </span>
              <span className={`font-bold text-2xl leading-none ${iconColor}`}>
                {confidencePercent}%
              </span>
            </div>
            <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-full h-2.5 overflow-hidden border border-black/5 dark:border-white/5">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out bg-current ${iconColor}`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}