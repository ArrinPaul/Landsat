"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  Trash2,
  Eye,
  PlusCircle,
  CheckCircle2,
  X,
  Layers,
  RefreshCw,
  Globe2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { INITIAL_DATASETS, type LandsatDatasetRecord } from "@/lib/admin-data";
import { syncLiveLandsatCatalogAction, type LiveStacCollection } from "@/lib/admin-actions";

export default function DatasetsManagementPage() {
  const [datasets, setDatasets] = useState<LandsatDatasetRecord[]>(INITIAL_DATASETS);
  const [liveStacProducts, setLiveStacProducts] = useState<LiveStacCollection[]>([]);
  const [isFetchingStac, setIsFetchingStac] = useState(false);
  const [activeTab, setActiveTab] = useState<"indices" | "usgs_stac">("indices");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedDataset, setSelectedDataset] = useState<LandsatDatasetRecord | null>(null);
  const [selectedStac, setSelectedStac] = useState<LiveStacCollection | null>(null);
  const [datasetToDelete, setDatasetToDelete] = useState<LandsatDatasetRecord | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [newDatasetForm, setNewDatasetForm] = useState({
    name: "",
    code: "",
    category: "Vegetation" as LandsatDatasetRecord["category"],
    sensor: "Landsat 8/9 OLI",
    resolution: "30m Spatial",
    description: "",
  });

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const fetchLiveStac = useCallback(async () => {
    setIsFetchingStac(true);
    try {
      const res = await syncLiveLandsatCatalogAction();
      if (res.collections && res.collections.length > 0) {
        setLiveStacProducts(res.collections);
        showNotification(`Synced ${res.totalCollections} live collections from USGS STAC API.`);
      }
    } catch (err: any) {
      showNotification(`STAC fetch error: ${err?.message}`);
    } finally {
      setIsFetchingStac(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchLiveStac();
  }, [fetchLiveStac]);

  const handleToggleActive = (id: string) => {
    setDatasets((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isActive: !d.isActive } : d))
    );
    showNotification("Pipeline status updated.");
  };

  const handleAddDataset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDatasetForm.name || !newDatasetForm.code) return;

    const created: LandsatDatasetRecord = {
      id: `ds_${newDatasetForm.code.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      name: newDatasetForm.name,
      code: newDatasetForm.code.toUpperCase(),
      category: newDatasetForm.category,
      sensor: newDatasetForm.sensor,
      resolution: newDatasetForm.resolution,
      isActive: true,
      lastSynced: "Just now",
      description: newDatasetForm.description || "Custom Landsat algorithm pipeline.",
      computeCount: 0,
    };

    setDatasets((prev) => [created, ...prev]);
    setNewDatasetForm({
      name: "",
      code: "",
      category: "Vegetation",
      sensor: "Landsat 8/9 OLI",
      resolution: "30m Spatial",
      description: "",
    });
    setIsAddOpen(false);
    showNotification(`Dataset ${created.code} registered.`);
  };

  const handleDelete = () => {
    if (!datasetToDelete) return;
    setDatasets((prev) => prev.filter((d) => d.id !== datasetToDelete.id));
    showNotification(`Dataset ${datasetToDelete.code} removed.`);
    setDatasetToDelete(null);
  };

  const filteredDatasets = datasets.filter((d) => {
    const query = search.toLowerCase();
    const matchesSearch =
      d.name.toLowerCase().includes(query) ||
      d.code.toLowerCase().includes(query) ||
      d.sensor.toLowerCase().includes(query);
    const matchesCategory = categoryFilter === "all" || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredStac = liveStacProducts.filter((p) => {
    const query = search.toLowerCase();
    return p.id.toLowerCase().includes(query) || p.title.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* View Switcher Tabs & Live Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab("indices")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "indices"
                ? "bg-background text-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Spectral Indices & AI Models ({datasets.length})
          </button>
          <button
            onClick={() => setActiveTab("usgs_stac")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "usgs_stac"
                ? "bg-background text-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe2 className="h-3.5 w-3.5 text-emerald-500" /> Live USGS STAC Catalog ({liveStacProducts.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchLiveStac}
            disabled={isFetchingStac}
            className="gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetchingStac ? "animate-spin" : ""}`} />
            {isFetchingStac ? "Syncing USGS..." : "Refresh Live STAC"}
          </Button>
          {activeTab === "indices" && (
            <Button
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add Pipeline
            </Button>
          )}
        </div>
      </div>

      {activeTab === "indices" ? (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-500" /> Spectral Transforms & Algorithms
            </CardTitle>
            <CardDescription className="text-xs">
              Configure active vegetation, moisture, thermal, and AI yield forecasting models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search index name, code, or sensor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Domains</option>
                <option value="Vegetation">Vegetation & Crops</option>
                <option value="Water Resources">Water Resources</option>
                <option value="Urban & Land">Urban & Land Use</option>
                <option value="Disaster & Wildfire">Disaster & Wildfire</option>
                <option value="Climate">Climate & Thermal</option>
              </select>
            </div>

            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border">
                  <tr className="text-muted-foreground font-semibold">
                    <th className="py-3 px-3">Spectral Code</th>
                    <th className="py-3 px-3">Name & Domain</th>
                    <th className="py-3 px-3">Sensor Source</th>
                    <th className="py-3 px-3">Resolution</th>
                    <th className="py-3 px-3">Computations</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDatasets.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-primary">{d.code}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-foreground">{d.name}</p>
                        <p className="text-[11px] text-muted-foreground">{d.category}</p>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground font-medium">{d.sensor}</td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{d.resolution}</td>
                      <td className="py-3 px-3 font-semibold text-foreground font-mono">
                        {d.computeCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleActive(d.id)}
                          className="flex items-center gap-1 text-xs font-semibold cursor-pointer"
                        >
                          {d.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              <ToggleRight className="h-4 w-4" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                              <ToggleLeft className="h-4 w-4" /> Inactive
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedDataset(d)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDatasetToDelete(d)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Live USGS STAC Products Catalog View */
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-emerald-500" /> Live USGS Landsat STAC Catalog Collections
            </CardTitle>
            <CardDescription className="text-xs">
              Live products fetched directly from <code className="font-mono text-primary">https://landsatlook.usgs.gov/stac-server</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search live USGS STAC collection ID or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border">
                  <tr className="text-muted-foreground font-semibold">
                    <th className="py-3 px-3">Collection ID</th>
                    <th className="py-3 px-3">USGS Product Title</th>
                    <th className="py-3 px-3">License</th>
                    <th className="py-3 px-3">Live Status</th>
                    <th className="py-3 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStac.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-primary">{p.id}</td>
                      <td className="py-3 px-3 font-medium text-foreground max-w-md">{p.title}</td>
                      <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">{p.license || "Public Domain"}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> USGS Online
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedStac(p)}
                          className="h-7 text-[11px] gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dataset Details Modal */}
      {selectedDataset && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDataset(null)}
        >
          <Card
            className="max-w-lg w-full border-border shadow-xl animate-in fade-in-50 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold font-mono text-primary">{selectedDataset.code} - {selectedDataset.name}</CardTitle>
                <CardDescription className="text-xs">{selectedDataset.category} domain</CardDescription>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedDataset(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
                <p className="text-muted-foreground leading-relaxed">{selectedDataset.description}</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border font-mono text-[11px]">
                  <p><span className="text-muted-foreground">Sensor:</span> {selectedDataset.sensor}</p>
                  <p><span className="text-muted-foreground">Resolution:</span> {selectedDataset.resolution}</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedDataset(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Live STAC Product Details Modal */}
      {selectedStac && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedStac(null)}
        >
          <Card
            className="max-w-lg w-full border-border shadow-xl animate-in fade-in-50 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold font-mono text-primary">{selectedStac.id}</CardTitle>
                <CardDescription className="text-xs">{selectedStac.title}</CardDescription>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedStac(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
                <p className="text-muted-foreground leading-relaxed">{selectedStac.description}</p>
                <div className="pt-2 border-t border-border space-y-1 font-mono text-[11px]">
                  <p><span className="text-muted-foreground">Source API:</span> https://landsatlook.usgs.gov/stac-server</p>
                  <p><span className="text-muted-foreground">License:</span> {selectedStac.license || "USGS / NASA Open Data Policy"}</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedStac(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Dataset Modal */}
      {isAddOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsAddOpen(false)}
        >
          <Card
            className="max-w-md w-full border-border shadow-xl animate-in fade-in-50 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Register Spectral Pipeline</CardTitle>
                <CardDescription className="text-xs">Configure algorithm and sensor source</CardDescription>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAddOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleAddDataset}>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1">
                  <Label htmlFor="ds-name">Index Name</Label>
                  <Input
                    id="ds-name"
                    placeholder="e.g. Enhanced Vegetation Index"
                    value={newDatasetForm.name}
                    onChange={(e) => setNewDatasetForm({ ...newDatasetForm, name: e.target.value })}
                    required
                    className="text-xs h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="ds-code">Spectral Code</Label>
                    <Input
                      id="ds-code"
                      placeholder="e.g. EVI"
                      value={newDatasetForm.code}
                      onChange={(e) => setNewDatasetForm({ ...newDatasetForm, code: e.target.value })}
                      required
                      className="text-xs h-9 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ds-cat">Domain Category</Label>
                    <select
                      id="ds-cat"
                      value={newDatasetForm.category}
                      onChange={(e) =>
                        setNewDatasetForm({
                          ...newDatasetForm,
                          category: e.target.value as LandsatDatasetRecord["category"],
                        })
                      }
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="Vegetation">Vegetation</option>
                      <option value="Water Resources">Water Resources</option>
                      <option value="Urban & Land">Urban & Land</option>
                      <option value="Disaster & Wildfire">Disaster & Wildfire</option>
                      <option value="Climate">Climate</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <Button size="sm" type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" className="gap-1.5">
                    <PlusCircle className="h-3.5 w-3.5" /> Save
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {datasetToDelete && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDatasetToDelete(null)}
        >
          <Card
            className="max-w-md w-full border-destructive/30 shadow-xl animate-in fade-in-50 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Delete Pipeline Registry
              </CardTitle>
              <CardDescription className="text-xs">
                Are you sure you want to remove <strong className="text-foreground">{datasetToDelete.name} ({datasetToDelete.code})</strong>?
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setDatasetToDelete(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDelete}>
                Delete Dataset
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
