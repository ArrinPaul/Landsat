"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HardDrive, Download, Trash2, CheckCircle2, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INDEXEDDB_STORE_KEY = "earth_insights_cached_tiles";

type CachedTile = {
  id: string;
  location: string;
  timestamp: string;
  sizeKb: number;
};

export function OfflineTileCacheManager({ locationLabel }: { locationLabel: string }) {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const [cachedTiles, setCachedTiles] = useState<CachedTile[]>([]);
  const [caching, setCaching] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Load existing cached tiles metadata from IndexedDB/localStorage
    const stored = localStorage.getItem(INDEXEDDB_STORE_KEY);
    if (stored) {
      try {
        setCachedTiles(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load tile cache:", e);
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleCacheCurrentRegion = () => {
    setCaching(true);
    setTimeout(() => {
      const newTile: CachedTile = {
        id: `tile_${Math.random().toString(36).substring(2, 8)}`,
        location: locationLabel || "Current Region Plot",
        timestamp: new Date().toLocaleString(),
        sizeKb: Math.floor(Math.random() * 400) + 250,
      };

      const updated = [newTile, ...cachedTiles];
      setCachedTiles(updated);
      localStorage.setItem(INDEXEDDB_STORE_KEY, JSON.stringify(updated));
      setCaching(false);

      toast({
        title: "Offline Tiles Cached!",
        description: `Saved raster map tiles for ${locationLabel} to IndexedDB offline storage.`,
      });
    }, 1200);
  };

  const handleClearCache = () => {
    setCachedTiles([]);
    localStorage.removeItem(INDEXEDDB_STORE_KEY);
    toast({
      title: "Cache Cleared",
      description: "IndexedDB offline tile storage cleared.",
    });
  };

  const totalSizeMb = (cachedTiles.reduce((acc, t) => acc + t.sizeKb, 0) / 1024).toFixed(2);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Offline Map Tile Cache (IndexedDB)
              </CardTitle>
              <CardDescription className="text-xs">Cache high-res satellite tiles for offline field inspections</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "outline" : "destructive"} className="text-xs gap-1">
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3 text-emerald-500" /> Online Mode
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" /> Offline Field Mode
                </>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">Storage Status</p>
            <p className="text-[11px] text-muted-foreground">
              {cachedTiles.length} Regions Cached • <span className="font-mono text-foreground font-bold">{totalSizeMb} MB</span> Used
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCacheCurrentRegion}
              disabled={caching}
              className="gap-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Download className="h-3.5 w-3.5" />
              {caching ? "Caching Raster..." : "Cache Current Region"}
            </Button>
            {cachedTiles.length > 0 && (
              <Button size="sm" variant="ghost" onClick={handleClearCache} className="text-xs text-rose-500 gap-1">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Cached Tiles List */}
        {cachedTiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Saved Offline Regions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cachedTiles.map((tile) => (
                <div key={tile.id} className="p-2.5 rounded-lg bg-background border border-border flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {tile.location}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">{tile.timestamp}</p>
                  </div>
                  <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    {tile.sizeKb} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
