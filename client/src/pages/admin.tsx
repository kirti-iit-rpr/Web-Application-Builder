import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { VehicleProfile } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  QrCode,
  Loader2,
  Search,
  Trash2,
  Download,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  List,
  Link as LinkIcon,
  LogOut,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { removeToken } from "@/lib/auth";

function generateIds(name: string, start: number, end: number, pad: number): string[] {
  const ids: string[] = [];
  for (let i = start; i <= end; i++) {
    ids.push(`${name}${String(i).padStart(pad, "0")}`);
  }
  return ids;
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AdminHeader({ totalCount }: { totalCount: number }) {
  const [, navigate] = useLocation();

  function handleLogout() {
    removeToken();
    queryClient.clear();
    navigate("/login");
  }

  return (
    <div className="border-b bg-card sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <QrCode className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground" data-testid="text-admin-title">
              Re<span className="text-primary">ho</span>
            </h1>
            <p className="text-xs text-muted-foreground font-mono tracking-wider uppercase">QR Admin Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/qr-generator">
            <Button variant="outline" size="sm" data-testid="link-qr-generator">
              <QrCode className="h-3.5 w-3.5" />
              QR Generator
            </Button>
          </Link>
          <span className="text-xs text-muted-foreground font-mono">
            Total: <span className="text-primary font-bold" data-testid="text-total-count">{totalCount}</span> tags
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

function TabBar({ active, onSwitch }: { active: "bulk" | "manage"; onSwitch: (tab: "bulk" | "manage") => void }) {
  return (
    <div className="border-b bg-card sticky top-[57px] z-40">
      <div className="max-w-6xl mx-auto px-4 flex gap-0">
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            active === "bulk"
              ? "text-primary border-primary"
              : "text-muted-foreground border-transparent"
          }`}
          onClick={() => onSwitch("bulk")}
          data-testid="tab-bulk-create"
        >
          <Layers className="h-3.5 w-3.5" />
          Bulk Create
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            active === "manage"
              ? "text-primary border-primary"
              : "text-muted-foreground border-transparent"
          }`}
          onClick={() => onSwitch("manage")}
          data-testid="tab-manage"
        >
          <List className="h-3.5 w-3.5" />
          Manage QRs
        </button>
      </div>
    </div>
  );
}

const bulkFormSchema = z.object({
  seriesName: z.string().min(1, "Series name is required").max(20),
  startNum: z.coerce.number().min(0, "Must be >= 0"),
  endNum: z.coerce.number().min(0, "Must be >= 0"),
  padding: z.coerce.number().min(1).max(6).default(3),
});
type BulkFormValues = z.infer<typeof bulkFormSchema>;

interface BatchResult {
  created: number;
  duplicates: number;
  tags: VehicleProfile[];
}

function BulkCreatePanel() {
  const { toast } = useToast();
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const { data: vehicles } = useQuery<VehicleProfile[]>({
    queryKey: ["/api/vehicles"],
  });

  const existingIds = useMemo(() => new Set(vehicles?.map((v) => v.qrId) || []), [vehicles]);

  const form = useForm<BulkFormValues>({
    resolver: zodResolver(bulkFormSchema),
    defaultValues: { seriesName: "", startNum: 1, endNum: 10, padding: 3 },
  });

  const seriesName = form.watch("seriesName");
  const startNum = form.watch("startNum");
  const endNum = form.watch("endNum");
  const padding = form.watch("padding");

  const previewData = useMemo(() => {
    const name = (seriesName || "").trim();
    const start = Number(startNum);
    const end = Number(endNum);
    const pad = Number(padding) || 3;

    if (!name || isNaN(start) || isNaN(end) || start > end) {
      return { ids: [], duplicates: [], newCount: 0, valid: false, tooMany: false };
    }

    const total = end - start + 1;
    if (total > 5000) {
      return { ids: [], duplicates: [], newCount: 0, valid: false, tooMany: true };
    }

    const ids = generateIds(name, start, end, pad);
    const duplicates = ids.filter((id) => existingIds.has(id));
    const newCount = ids.length - duplicates.length;

    return { ids, duplicates, newCount, valid: true, tooMany: false };
  }, [seriesName, startNum, endNum, padding, existingIds]);

  const handleBulkCreate = async (values: BulkFormValues) => {
    const name = values.seriesName.trim();
    const ids = generateIds(name, values.startNum, values.endNum, values.padding);
    const newIds = ids.filter((id) => !existingIds.has(id));

    if (newIds.length === 0) {
      toast({ title: "No New Tags", description: "All IDs already exist.", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    setProgress(10);

    try {
      setProgress(40);
      const res = await apiRequest("POST", "/api/tags/bulk", { qrIds: newIds });
      setProgress(80);
      const result = await res.json();
      setProgress(100);

      setBatchResult({
        created: result.created,
        duplicates: result.duplicates,
        tags: result.tags,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });

      toast({
        title: "Batch Created",
        description: `${result.created} tags created successfully.`,
      });
    } catch (error: any) {
      toast({ title: "Batch Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const exportLastBatch = useCallback(() => {
    if (!batchResult?.tags?.length) return;
    const header = "Tag ID,Tag URL,Status,Created";
    const rows = batchResult.tags.map(
      (t) => `${t.qrId},https://scan.reho.co.in/tag/${t.qrId},inactive,${new Date().toISOString().split("T")[0]}`
    );
    downloadCsv(header + "\n" + rows.join("\n"), "reho-batch-export.csv");
  }, [batchResult]);

  const resetForm = () => {
    form.reset();
    setBatchResult(null);
    setProgress(0);
  };

  const showPreviewChips = previewData.valid && previewData.ids.length > 0;
  const previewSlice = previewData.ids.slice(0, 6);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-bulk-title">BULK CREATE</h2>
        <p className="text-xs text-muted-foreground font-mono mt-1">// generate a series of QR tag IDs in one shot</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-mono tracking-widest uppercase text-primary">Series Configuration</h3>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleBulkCreate)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="seriesName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Series Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. A, BAG, R" maxLength={20} data-testid="input-series-name" {...field} />
                      </FormControl>
                      <p className="text-[11px] text-muted-foreground">Prefix for all tag IDs</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startNum"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Start Number *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" min={0} data-testid="input-start-num" {...field} />
                      </FormControl>
                      <p className="text-[11px] text-muted-foreground">First number in range</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endNum"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-mono uppercase tracking-wider text-muted-foreground">End Number *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" min={0} data-testid="input-end-num" {...field} />
                      </FormControl>
                      <p className="text-[11px] text-muted-foreground">Last number in range</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="padding"
                render={({ field }) => (
                  <FormItem className="max-w-[200px]">
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Padding (digits)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={6} data-testid="input-padding" {...field} />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">e.g. padding=3 → A001, A002</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground min-w-[70px]">Preview</span>
                  <div className="flex gap-2 flex-wrap" data-testid="preview-tags">
                    {previewData.tooMany && (
                      <span className="text-xs text-destructive font-mono">Max 5000 per batch</span>
                    )}
                    {!previewData.valid && !previewData.tooMany && (
                      <span className="text-xs text-muted-foreground font-mono">— fill in fields above —</span>
                    )}
                    {showPreviewChips && previewSlice.map((id) => (
                      <Badge key={id} variant="outline" className="font-mono text-xs text-primary border-primary/30 bg-primary/5" data-testid={`chip-preview-${id}`}>
                        {id}
                      </Badge>
                    ))}
                    {showPreviewChips && previewData.ids.length > 6 && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        …+{previewData.ids.length - 6} more ({previewData.ids.length} total,{" "}
                        <span className="text-chart-2">{previewData.newCount} new</span>)
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {previewData.duplicates.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3" data-testid="duplicate-warning">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">Duplicate IDs Detected</span>
                  </div>
                  <p className="text-xs text-destructive/80 mb-2">The following already exist and will be skipped:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {previewData.duplicates.slice(0, 20).map((d) => (
                      <Badge key={d} variant="destructive" className="text-[10px] font-mono">{d}</Badge>
                    ))}
                    {previewData.duplicates.length > 20 && (
                      <span className="text-xs text-destructive/60">+{previewData.duplicates.length - 20} more</span>
                    )}
                  </div>
                </div>
              )}

              {isCreating && progress > 0 && (
                <Progress value={progress} className="h-1" data-testid="progress-bar" />
              )}

              <div className="flex gap-3 flex-wrap">
                <Button
                  type="submit"
                  disabled={isCreating || !previewData.valid || previewData.newCount === 0}
                  data-testid="button-bulk-create"
                >
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Series
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!batchResult?.tags?.length}
                  onClick={exportLastBatch}
                  data-testid="button-export-batch"
                >
                  <Download className="h-4 w-4" />
                  Export Last Batch (.csv)
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} data-testid="button-reset-form">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {batchResult && (
        <Card data-testid="batch-result-card">
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <CheckCircle2 className="h-4 w-4 text-chart-2" />
            <h3 className="text-xs font-mono tracking-widest uppercase text-chart-2">Last Batch Result</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 font-mono text-sm">
              <div className="flex items-center gap-2 text-chart-2" data-testid="text-batch-created">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {batchResult.created} tags created
              </div>
              {batchResult.duplicates > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground" data-testid="text-batch-skipped">
                  <XCircle className="h-3.5 w-3.5" />
                  {batchResult.duplicates} skipped (duplicate)
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const singleCreateSchema = z.object({
  qrId: z.string().min(1, "QR ID is required").max(50),
});

function ManagePanel() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: vehicles, isLoading } = useQuery<VehicleProfile[]>({
    queryKey: ["/api/vehicles"],
  });

  const form = useForm<{ qrId: string }>({
    resolver: zodResolver(singleCreateSchema),
    defaultValues: { qrId: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { qrId: string }) => {
      const res = await apiRequest("POST", "/api/vehicle", { qrId: data.qrId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      form.reset();
      toast({ title: "QR Code Created", description: "New QR code registered." });
    },
    onError: (error: Error) => {
      toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (qrId: string) => {
      await apiRequest("DELETE", `/api/vehicle/${qrId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Deleted", description: "Tag removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (qrIds: string[]) => {
      await apiRequest("DELETE", "/api/tags/bulk", { qrIds });
    },
    onSuccess: (_, qrIds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setSelectedIds(new Set());
      toast({ title: "Bulk Delete", description: `${qrIds.length} tags deleted.` });
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ qrId, isActive }: { qrId: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/vehicle/${qrId}`, { isActive: !isActive } as any);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    },
    onError: (error: Error) => {
      toast({ title: "Toggle Failed", description: error.message, variant: "destructive" });
    },
  });

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];
    if (!searchQuery.trim()) return vehicles;
    const q = searchQuery.toLowerCase();
    return vehicles.filter((v) => v.qrId.toLowerCase().includes(q));
  }, [vehicles, searchQuery]);

  const activeCount = vehicles?.filter((v) => v.isActive).length ?? 0;
  const inactiveCount = (vehicles?.length ?? 0) - activeCount;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredVehicles.map((v) => v.qrId)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleAllVisible = (checked: boolean) => {
    if (checked) selectAll();
    else clearSelection();
  };

  const exportAllCsv = async () => {
    try {
      const token = localStorage.getItem("reho_admin_token");
      const res = await fetch("/api/tags/export", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reho-tags-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };

  const exportSelectedCsv = () => {
    if (selectedIds.size === 0) return;
    const selected = vehicles?.filter((v) => selectedIds.has(v.qrId)) || [];
    const header = "Tag ID,Tag URL,Status,Created";
    const rows = selected.map(
      (v) => `${v.qrId},https://scan.reho.co.in/tag/${v.qrId},${v.isActive ? "active" : "inactive"},${v.createdAt ? new Date(v.createdAt).toISOString().split("T")[0] : ""}`
    );
    downloadCsv(header + "\n" + rows.join("\n"), "reho-selected-export.csv");
  };

  const allVisibleSelected = filteredVehicles.length > 0 && filteredVehicles.every((v) => selectedIds.has(v.qrId));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-manage-title">MANAGE QRs</h2>
        <p className="text-xs text-muted-foreground font-mono mt-1">// view, filter &amp; export all existing tags</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Plus className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-mono tracking-widest uppercase text-primary">Create New QR Code</h3>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="flex gap-3 items-start flex-wrap">
              <FormField
                control={form.control}
                name="qrId"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Unique QR ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. BAG042" maxLength={40} data-testid="input-single-qr-id" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-[22px]">
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-single-create">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" className="font-mono text-xs" data-testid="badge-total-count">
                Total: <span className="text-primary font-bold ml-1">{vehicles?.length ?? 0}</span>
              </Badge>
              <Badge variant="secondary" className="font-mono text-xs" data-testid="badge-active-count">
                Active: <span className="text-chart-2 font-bold ml-1">{activeCount}</span>
              </Badge>
              <Badge variant="secondary" className="font-mono text-xs" data-testid="badge-inactive-count">
                Inactive: <span className="text-muted-foreground font-bold ml-1">{inactiveCount}</span>
              </Badge>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search tag ID..."
                  className="pl-8 w-[200px] font-mono text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={exportAllCsv} data-testid="button-export-all">
                <Download className="h-3.5 w-3.5" />
                Export All
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={exportSelectedCsv}
                data-testid="button-export-selected"
              >
                <Download className="h-3.5 w-3.5" />
                Export Selected
              </Button>
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-md border border-primary/20 bg-primary/5 mb-4 flex-wrap" data-testid="select-bar">
              <span className="text-sm font-mono">
                <span className="text-primary font-bold" data-testid="text-selected-count">{selectedIds.size}</span> selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
                disabled={bulkDeleteMutation.isPending}
                data-testid="button-delete-selected"
              >
                {bulkDeleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete Selected
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection} data-testid="button-clear-selection">
                Clear
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <QrCode className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">No QR tags found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(checked) => toggleAllVisible(!!checked)}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest uppercase">Tag ID</TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest uppercase">Tag URL</TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest uppercase">Status</TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest uppercase">Created</TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((v) => (
                    <TableRow key={v.qrId} data-testid={`row-tag-${v.qrId}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(v.qrId)}
                          onCheckedChange={() => toggleSelect(v.qrId)}
                          data-testid={`checkbox-${v.qrId}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-bold text-primary text-sm" data-testid={`text-tagid-${v.qrId}`}>
                        {v.qrId}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[250px] block" data-testid={`text-url-${v.qrId}`}>
                          scan.reho.co.in/tag/{v.qrId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleMutation.mutate({ qrId: v.qrId, isActive: v.isActive })}
                          className="cursor-pointer"
                          data-testid={`button-toggle-${v.qrId}`}
                        >
                          <Badge
                            variant={v.isActive ? "default" : "secondary"}
                            className={`text-[10px] font-mono tracking-widest uppercase ${
                              v.isActive
                                ? "bg-chart-2/10 text-chart-2 border-chart-2/30"
                                : ""
                            }`}
                          >
                            {v.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {v.createdAt ? new Date(v.createdAt).toISOString().split("T")[0] : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <a href={`/v/${v.qrId}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="icon" data-testid={`button-view-${v.qrId}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(`https://scan.reho.co.in/tag/${v.qrId}`);
                              toast({ title: "Copied", description: "URL copied to clipboard." });
                            }}
                            data-testid={`button-copy-${v.qrId}`}
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => deleteMutation.mutate(v.qrId)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${v.qrId}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"bulk" | "manage">("bulk");

  const { data: vehicles } = useQuery<VehicleProfile[]>({
    queryKey: ["/api/vehicles"],
  });

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader totalCount={vehicles?.length ?? 0} />
      <TabBar active={activeTab} onSwitch={setActiveTab} />
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === "bulk" ? <BulkCreatePanel /> : <ManagePanel />}
      </div>
    </div>
  );
}
