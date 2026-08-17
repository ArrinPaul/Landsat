"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Plus, User, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SpatialAnnotation = {
  id: string;
  author: string;
  role: string;
  text: string;
  coords: string;
  timestamp: string;
};

export function SpatialTeamCollaborationWorkspace({ locationLabel }: { locationLabel: string }) {
  const { toast } = useToast();
  const [newAnnotation, setNewAnnotation] = useState("");
  const [annotations, setAnnotations] = useState<SpatialAnnotation[]>([
    {
      id: "ann_1",
      author: "Dr. Elena Rostova",
      role: "Lead Remote Sensing Agronomist",
      text: "Sector B crop canopy shows early nitrogen deficiency. Recommend soil sampling before Friday.",
      coords: "40.7145° N, -74.0082° W",
      timestamp: "25 mins ago",
    },
    {
      id: "ann_2",
      author: "Markus Vance",
      role: "GIS Field Inspector",
      text: "Verified irrigation pivot pipeline repair on site. Surface NDWI moisture levels restored.",
      coords: "40.7112° N, -74.0019° W",
      timestamp: "2 hours ago",
    },
  ]);

  const handleAddAnnotation = () => {
    if (!newAnnotation.trim()) return;
    const item: SpatialAnnotation = {
      id: `ann_${Date.now()}`,
      author: "Current User",
      role: "Analyst",
      text: newAnnotation,
      coords: `${locationLabel} Pin`,
      timestamp: "Just now",
    };
    setAnnotations([item, ...annotations]);
    setNewAnnotation("");
    toast({
      title: "Spatial Pin Dropped!",
      description: "Annotation shared across live team workspace.",
    });
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Multi-User Spatial Collaboration Workspace <Sparkles className="h-4 w-4 text-emerald-500" />
              </CardTitle>
              <CardDescription className="text-xs">Real-time team pin dropping, polygon notes, and field inspection sharing</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono text-emerald-500 border-emerald-500/30 gap-1">
            <Users className="h-3 w-3" /> 3 Team Members Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Annotation Input Bar */}
        <div className="flex gap-2">
          <Input
            placeholder={`Drop spatial pin note for ${locationLabel}...`}
            value={newAnnotation}
            onChange={(e) => setNewAnnotation(e.target.value)}
            className="text-xs"
          />
          <Button
            size="sm"
            onClick={handleAddAnnotation}
            disabled={!newAnnotation.trim()}
            className="gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Drop Pin
          </Button>
        </div>

        {/* Live Annotations Feed */}
        <div className="space-y-2.5">
          {annotations.map((a) => (
            <div key={a.id} className="p-3 rounded-xl bg-muted/20 border border-border space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-500 font-bold flex items-center justify-center text-[10px]">
                    <User className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="font-bold text-foreground">{a.author}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5 font-medium">({a.role})</span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{a.timestamp}</span>
              </div>
              <p className="text-foreground pl-8 leading-relaxed">{a.text}</p>
              <div className="pl-8 pt-1 flex items-center gap-1 text-[10px] font-mono text-emerald-500">
                <MapPin className="h-3 w-3" /> Pin Location: {a.coords}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
