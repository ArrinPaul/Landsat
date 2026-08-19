"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  Download,
  Trash2,
  Eye,
  PlusCircle,
  CheckCircle2,
  X,
  Layers,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { INITIAL_DATASETS, type LandsatDatasetRecord } from "@/lib/admin-data";

export default function DatasetsManagementPage() {
  const [datasets, setDatasets] = useState<LandsatDatasetRecord[]>(INITIAL_DATASETS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedDataset, setSelectedDataset] = useState<LandsatDatasetRecord | null>(null);
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

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleToggleActive = (id: string) => {
    setDatasets((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isActive: !d.isActive } : d))
    );
    showNotification("Dataset pipeline status updated.");
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
    showNotification(`Dataset ${created.code} added to pipeline catalog.`);
  };

  const handleDelete = () => {
    if (!datasetToDelete) return;
    setDatasets((prev) => prev.filter((d) => d.id !== datasetToDelete.id));
    showNotification(`Dataset ${datasetToDelete.code} removed from catalog.`);
    setDatasetToDelete(null);
    if (selectedDataset?.id === datasetToDelete.id) {
      setSelectedDataset(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Name", "Code", "Category", "Sensor", "Resolution", "Status", "Computations"];
    const rows = datasets.map((d) => [
      d.id,
      `"${d.name}"`,
      d.code,
      d.category,
      `"${d.sensor}"`,
      `"${d.resolution}"`,
      d.isActive ? "Active" : "Inactive",
      d.computeCount,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `landsat_datasets_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Datasets catalog exported to CSV.");
  };

  const filteredDatasets = datasets.filter((d) => {
    const query = search.toLowerCase();
    const matchesSearch =
      d.name.toLowerCase().includes(query) ||
      d.code.toLowerCase().includes(query) ||
      d.sensor.toLowerCase().includes(query) ||
      d.description.toLowerCase().includes(query);
    const matchesCategory = categoryFilter === "all" || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Total Pipelines</p>
          <p className="text-2xl font-bold text-foreground mt-1">{datasets.length}</p>
        </Card>
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Active Indices</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">
            {datasets.filter((d) => d.isActive).length}
          </p>
        </Card>
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Total Executions</p>
          <p className="text-2xl font-bold text-primary mt-1">
            {datasets.reduce((acc, d) => acc + d.computeCount, 0).toLocaleString()}
          </p>
        </Card>
        <Card className="border-border shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Satellite Sensors</p>
          <p className="text-2xl font-bold text-indigo-500 mt-1">Landsat 8/9</p>
        </Card>
      </div>

      {/* Datasets Catalog Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-500" /> Spectral Indices & AI Models Registry
            </CardTitle>
            <CardDescription>
              Configure available multi-spectral transforms, earth observation bands, and AI models
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="gap-1.5 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add Dataset
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search index name, spectral code, or sensor..."
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

          {/* Table */}
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-muted-foreground font-semibold">
                  <th className="py-3 px-3">Spectral Code</th>
                  <th className="py-3 px-3">Dataset Name & Domain</th>
                  <th className="py-3 px-3">Sensor Source</th>
                  <th className="py-3 px-3">Spatial Resolution</th>
                  <th className="py-3 px-3">Computations</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDatasets.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {d.code}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-semibold text-foreground">{d.name}</p>
                        <p className="text-[11px] text-muted-foreground">{d.category}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground font-medium">{d.sensor}</td>
                    <td className="py-3 px-3 text-muted-foreground font-mono">{d.resolution}</td>
                    <td className="py-3 px-3 font-semibold text-foreground">
                      {d.computeCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleActive(d.id)}
                        className="flex items-center gap-1 text-xs font-semibold cursor-pointer group"
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
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setSelectedDataset(d)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDatasetToDelete(d)}
                          className="h-7 w-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                          title="Delete Dataset"
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

          {filteredDatasets.length === 0 && (
            <div className="text-center py-10 border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground">No dataset pipelines matching your query</p>
            </div>
          )}
        </CardContent>
      </Card>

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
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span className="font-mono text-primary">{selectedDataset.code}</span> - {selectedDataset.name}
                </CardTitle>
                <CardDescription className="text-xs">Spectral formula and sensor telemetry</CardDescription>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedDataset(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
                <p className="text-muted-foreground leading-relaxed">{selectedDataset.description}</p>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-semibold">Sensor Source</span>
                    <p className="font-medium text-foreground">{selectedDataset.sensor}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-semibold">Domain Category</span>
                    <p className="font-medium text-foreground">{selectedDataset.category}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-semibold">Spatial Resolution</span>
                    <p className="font-mono text-foreground">{selectedDataset.resolution}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-semibold">Last Catalog Sync</span>
                    <p className="font-mono text-foreground">{selectedDataset.lastSynced}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedDataset(null)}>
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
                <CardTitle className="text-base font-bold">Register Landsat Pipeline</CardTitle>
                <CardDescription className="text-xs">Add new spectral index or model transformation</CardDescription>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAddOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleAddDataset}>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1">
                  <Label htmlFor="ds-name">Index / Pipeline Name</Label>
                  <Input
                    id="ds-name"
                    placeholder="e.g. Enhanced Vegetation Index (EVI)"
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="ds-sensor">Satellite Sensor</Label>
                    <Input
                      id="ds-sensor"
                      placeholder="e.g. Landsat 8/9 OLI"
                      value={newDatasetForm.sensor}
                      onChange={(e) => setNewDatasetForm({ ...newDatasetForm, sensor: e.target.value })}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ds-res">Spatial Resolution</Label>
                    <Input
                      id="ds-res"
                      placeholder="e.g. 30m Spatial"
                      value={newDatasetForm.resolution}
                      onChange={(e) => setNewDatasetForm({ ...newDatasetForm, resolution: e.target.value })}
                      className="text-xs h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ds-desc">Formula / Description</Label>
                  <Input
                    id="ds-desc"
                    placeholder="e.g. 2.5 * ((NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1))"
                    value={newDatasetForm.description}
                    onChange={(e) => setNewDatasetForm({ ...newDatasetForm, description: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <Button size="sm" type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" className="gap-1.5">
                    <PlusCircle className="h-3.5 w-3.5" /> Save Pipeline
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
