import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  Download,
  QrCode,
  Trash2,
  ArrowLeft,
  Settings2,
  Palette,
  Hash,
  Link as LinkIcon,
  Type,
  LogOut,
} from "lucide-react";
import QRCode from "qrcode";
import { removeToken } from "@/lib/auth";

function drawPill(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  fill: string
) {
  const w = x1 - x0;
  const r = w / 2;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x0 + r, y0 + r, r, Math.PI, 0);
  ctx.lineTo(x1, y1 - r);
  ctx.arc(x0 + r, y1 - r, r, 0, Math.PI);
  ctx.lineTo(x0, y0 + r);
  ctx.closePath();
  ctx.fill();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  fill: string
) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0);
  ctx.lineTo(x1 - r, y0);
  ctx.quadraticCurveTo(x1, y0, x1, y0 + r);
  ctx.lineTo(x1, y1 - r);
  ctx.quadraticCurveTo(x1, y1, x1 - r, y1);
  ctx.lineTo(x0 + r, y1);
  ctx.quadraticCurveTo(x0, y1, x0, y1 - r);
  ctx.lineTo(x0, y0 + r);
  ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
  ctx.closePath();
  ctx.fill();
}

function drawFinder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ms: number,
  color: string,
  bg: string
) {
  const outer = 7 * ms;
  const border = ms;
  const ro = ms * 1.4;
  const ri = ro * 0.7;
  const ir = (3 * ms) / 2;
  roundedRect(ctx, x, y, x + outer, y + outer, ro, color);
  roundedRect(
    ctx,
    x + border,
    y + border,
    x + outer - border,
    y + outer - border,
    ri,
    bg
  );
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + outer / 2, y + outer / 2, ir, 0, Math.PI * 2);
  ctx.fill();
}

async function getQRMatrix(url: string): Promise<boolean[][]> {
  const segments = QRCode.create(url, { errorCorrectionLevel: "H" });
  const modules = segments.modules;
  const size = modules.size;
  const data = modules.data;
  const matrix: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      row.push(data[r * size + c] === 1);
    }
    matrix.push(row);
  }
  return matrix;
}

function renderRehoQR(
  canvas: HTMLCanvasElement,
  matrix: boolean[][],
  opts: {
    size?: number;
    bgColor?: string;
    moduleColor?: string;
    marginRatio?: number;
  } = {}
) {
  const {
    size = 800,
    bgColor = "#1a1a1a",
    moduleColor = "#FF6B1A",
    marginRatio = 0.06,
  } = opts;

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;
  const n = matrix.length;
  const margin = size * marginRatio;
  const qrArea = size - 2 * margin;
  const mPx = qrArea / n;

  roundedRect(ctx, 0, 0, size, size, size * 0.04, bgColor);

  const finderZones: [number, number][] = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ];

  function inFinder(r: number, c: number) {
    return finderZones.some(
      ([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7
    );
  }

  const visited = Array.from({ length: n }, () => new Array(n).fill(false));

  for (let col = 0; col < n; col++) {
    let row = 0;
    while (row < n) {
      if (
        !matrix[row]?.[col] ||
        inFinder(row, col) ||
        visited[row][col]
      ) {
        row++;
        continue;
      }

      const runStart = row;
      while (
        row < n &&
        matrix[row]?.[col] &&
        !inFinder(row, col) &&
        !visited[row][col]
      ) {
        visited[row][col] = true;
        row++;
      }
      const runEnd = row;
      const runLen = runEnd - runStart;

      const gap = mPx * 0.15;
      const px0 = margin + col * mPx + gap;
      const px1 = margin + (col + 1) * mPx - gap;
      const py0 = margin + runStart * mPx + gap;
      const py1 = margin + runEnd * mPx - gap;

      if (runLen === 1) {
        const r = (px1 - px0) * 0.42;
        roundedRect(ctx, px0, py0, px1, py1, r, moduleColor);
      } else {
        drawPill(ctx, px0, py0, px1, py1, moduleColor);
      }
    }
  }

  finderZones.forEach(([fr, fc]) => {
    drawFinder(ctx, margin + fc * mPx, margin + fr * mPx, mPx, moduleColor, bgColor);
  });
}

function generateTagIds(
  name: string,
  start: number,
  end: number,
  pad: number
) {
  const ids: string[] = [];
  for (let i = start; i <= end; i++) {
    ids.push(`${name}${String(i).padStart(pad, "0")}`);
  }
  return ids;
}

interface GeneratedQR {
  tagId: string;
  dataUrl: string;
  canvas: HTMLCanvasElement;
}

export default function QRGeneratorPage() {
  const { toast } = useToast();

  const [baseUrl, setBaseUrl] = useState("https://findmyowner.replit.app/v/");
  const [seriesName, setSeriesName] = useState("");
  const [startNum, setStartNum] = useState("");
  const [endNum, setEndNum] = useState("");
  const [padding, setPadding] = useState("3");
  const [moduleColor, setModuleColor] = useState("#FF6B1A");
  const [bgColor, setBgColor] = useState("#1a1a1a");
  const [qrSize, setQrSize] = useState("800");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [generatedQRs, setGeneratedQRs] = useState<GeneratedQR[]>([]);
  const [zipping, setZipping] = useState(false);

  const generatedRef = useRef<GeneratedQR[]>([]);

  const start = parseInt(startNum);
  const end = parseInt(endNum);
  const pad = parseInt(padding) || 3;

  const isValid =
    seriesName.trim() &&
    !isNaN(start) &&
    !isNaN(end) &&
    start <= end &&
    end - start + 1 <= 500;

  const previewIds = isValid
    ? generateTagIds(seriesName.trim(), start, end, pad)
    : [];
  const totalCount = previewIds.length;

  const handleGenerate = useCallback(async () => {
    if (!isValid) return;
    setGenerating(true);
    setProgress(0);
    setGeneratedQRs([]);
    generatedRef.current = [];

    const ids = generateTagIds(seriesName.trim(), start, end, pad);
    const size = parseInt(qrSize) || 800;
    const results: GeneratedQR[] = [];

    for (let i = 0; i < ids.length; i++) {
      const tagId = ids[i];
      const url = baseUrl + tagId;

      setProgressLabel(`Generating ${tagId}... (${i + 1}/${ids.length})`);
      setProgress(((i + 1) / ids.length) * 100);

      const matrix = await getQRMatrix(url);
      const canvas = document.createElement("canvas");
      renderRehoQR(canvas, matrix, {
        size,
        bgColor,
        moduleColor,
      });

      const dataUrl = canvas.toDataURL("image/png");
      results.push({ tagId, dataUrl, canvas });

      if (i % 5 === 0 || i === ids.length - 1) {
        setGeneratedQRs([...results]);
        generatedRef.current = [...results];
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    setGeneratedQRs(results);
    generatedRef.current = results;
    setGenerating(false);
    setProgressLabel("");
    toast({
      title: "Generation Complete",
      description: `${ids.length} QR codes generated successfully`,
    });
  }, [isValid, seriesName, start, end, pad, baseUrl, qrSize, bgColor, moduleColor, toast]);

  const downloadSingle = useCallback(
    (tagId: string) => {
      const item = generatedRef.current.find((q) => q.tagId === tagId);
      if (!item) return;
      item.canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `reho_qr_${tagId}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    },
    []
  );

  const downloadZip = useCallback(async () => {
    const qrs = generatedRef.current;
    if (!qrs.length) return;
    setZipping(true);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const folder = zip.folder("reho_qrs")!;

      for (const { tagId, canvas } of qrs) {
        const blob = await new Promise<Blob | null>((r) =>
          canvas.toBlob(r, "image/png")
        );
        if (blob) {
          const ab = await blob.arrayBuffer();
          folder.file(`reho_qr_${tagId}.png`, ab);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = `reho_qrs_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);

      toast({
        title: "ZIP Downloaded",
        description: `ZIP with ${qrs.length} QR codes`,
      });
    } catch {
      toast({
        title: "ZIP Failed",
        description: "Could not create ZIP file",
        variant: "destructive",
      });
    } finally {
      setZipping(false);
    }
  }, [toast]);

  const clearAll = useCallback(() => {
    setGeneratedQRs([]);
    generatedRef.current = [];
    setProgress(0);
    setProgressLabel("");
  }, []);

  return (
    <div className="reho-screen" style={{ minHeight: "100vh" }}>
      <header
        className="flex items-center justify-between gap-4 flex-wrap px-5 md:px-10 py-4"
        style={{
          borderBottom: "1px solid var(--reho-border)",
          background: "var(--reho-surface)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button
              size="icon"
              variant="ghost"
              data-testid="button-back-admin"
              style={{ color: "var(--reho-soft)" }}
            >
              <ArrowLeft />
            </Button>
          </Link>
          <span className="reho-brand" style={{ marginBottom: 0 }}>
            <span className="reho-brand-re">Re</span>
            <span className="reho-brand-ho">ho</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            data-testid="badge-qr-generator"
            style={{
              background: "var(--reho-orange-dim)",
              borderColor: "var(--reho-orange-border)",
              color: "var(--reho-orange)",
              fontSize: "0.6rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontFamily: "'DM Mono', monospace",
            }}
            className="no-default-hover-elevate no-default-active-elevate"
          >
            QR Batch Generator
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            data-testid="button-logout-qr"
            onClick={() => { removeToken(); window.location.href = "/login"; }}
            style={{ color: "var(--reho-soft)" }}
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "0.6rem",
            color: "var(--reho-muted)",
            letterSpacing: "0.08em",
          }}
        >
          PNG &middot; {qrSize}x{qrSize}
        </span>
      </header>

      <div
        className="grid gap-7 p-5 md:p-10 mx-auto"
        style={{
          maxWidth: 1200,
          gridTemplateColumns: "clamp(300px, 380px, 100%) 1fr",
        }}
      >
        <div
          className="contents md:grid"
          style={{ display: "contents" }}
        >
          <div
            style={{
              background: "var(--reho-surface)",
              border: "1px solid var(--reho-border)",
              borderRadius: 14,
              padding: 28,
            }}
          >
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.52rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--reho-orange)",
                marginBottom: 18,
              }}
            >
              <ChevronRight
                className="inline"
                style={{ width: 10, height: 10, marginRight: 4 }}
              />
              Series Configuration
            </div>
            <div
              className="reho-title"
              style={{ marginBottom: 4 }}
              data-testid="text-generate-title"
            >
              GENERATE QRs
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--reho-muted)",
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              Define a series — each tag gets a unique QR PNG rendered in the
              Reho pill style. Download individually or as a ZIP.
            </p>

            <div className="flex flex-col gap-2 mb-4">
              <Label
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.52rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--reho-muted)",
                }}
              >
                <LinkIcon
                  className="inline"
                  style={{ width: 10, height: 10, marginRight: 4 }}
                />
                Base URL *
              </Label>
              <Input
                data-testid="input-base-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="reho-input-field"
                style={{ height: 44 }}
              />
              <span
                style={{
                  fontSize: "0.6rem",
                  color: "var(--reho-muted)",
                  paddingLeft: 4,
                }}
              >
                Tag ID appended to end
              </span>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              <Label
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.52rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--reho-muted)",
                }}
              >
                <Type
                  className="inline"
                  style={{ width: 10, height: 10, marginRight: 4 }}
                />
                Series Name *
              </Label>
              <Input
                data-testid="input-series-name"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                placeholder="e.g. A, R, BAG"
                maxLength={20}
                className="reho-input-field"
                style={{ height: 44 }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex flex-col gap-2">
                <Label
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.52rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--reho-muted)",
                  }}
                >
                  <Hash
                    className="inline"
                    style={{ width: 10, height: 10, marginRight: 4 }}
                  />
                  Start No
                </Label>
                <Input
                  data-testid="input-start-num"
                  type="number"
                  value={startNum}
                  onChange={(e) => setStartNum(e.target.value)}
                  placeholder="1"
                  min={0}
                  className="reho-input-field"
                  style={{ height: 44 }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.52rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--reho-muted)",
                  }}
                >
                  <Hash
                    className="inline"
                    style={{ width: 10, height: 10, marginRight: 4 }}
                  />
                  End No
                </Label>
                <Input
                  data-testid="input-end-num"
                  type="number"
                  value={endNum}
                  onChange={(e) => setEndNum(e.target.value)}
                  placeholder="10"
                  min={0}
                  className="reho-input-field"
                  style={{ height: 44 }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              <Label
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.52rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--reho-muted)",
                }}
              >
                Padding (digits)
              </Label>
              <Input
                data-testid="input-padding"
                type="number"
                value={padding}
                onChange={(e) => setPadding(e.target.value)}
                min={1}
                max={6}
                className="reho-input-field"
                style={{ height: 44 }}
              />
              <span
                style={{
                  fontSize: "0.6rem",
                  color: "var(--reho-muted)",
                  paddingLeft: 4,
                }}
              >
                3 → A001 &middot; 4 → A0001
              </span>
            </div>

            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.5rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--reho-muted)",
                marginBottom: 8,
              }}
            >
              Tag ID Preview
            </div>
            <div
              data-testid="container-tag-preview"
              style={{
                background: "var(--reho-bg)",
                border: "1px solid var(--reho-border)",
                borderRadius: 10,
                padding: 14,
                marginBottom: 18,
                minHeight: 48,
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                alignItems: "center",
              }}
            >
              {previewIds.length === 0 && (
                <span
                  style={{
                    color: "var(--reho-muted)",
                    fontSize: "0.65rem",
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  — fill fields above —
                </span>
              )}
              {previewIds.slice(0, 6).map((id) => (
                <span
                  key={id}
                  data-testid={`chip-preview-${id}`}
                  style={{
                    background: "var(--reho-orange-dim)",
                    border: "1px solid var(--reho-orange-border)",
                    color: "var(--reho-orange)",
                    padding: "3px 9px",
                    borderRadius: 4,
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                  }}
                >
                  {id}
                </span>
              ))}
              {previewIds.length > 6 && (
                <span
                  style={{
                    background: "var(--reho-surface2)",
                    border: "1px solid var(--reho-border)",
                    color: "var(--reho-muted)",
                    padding: "3px 9px",
                    borderRadius: 4,
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                  }}
                >
                  +{previewIds.length - 6} more
                </span>
              )}
              {!isNaN(start) &&
                !isNaN(end) &&
                start <= end &&
                end - start + 1 > 500 && (
                  <span
                    style={{
                      color: "#ef4444",
                      fontSize: "0.65rem",
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    Max 500 per batch
                  </span>
                )}
            </div>

            <div
              data-testid="button-toggle-advanced"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.6rem",
                color: "var(--reho-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 14,
                userSelect: "none",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <ChevronRight
                style={{
                  width: 12,
                  height: 12,
                  transition: "transform 0.2s",
                  transform: showAdvanced ? "rotate(90deg)" : "rotate(0deg)",
                }}
              />
              <Settings2 style={{ width: 12, height: 12 }} />
              Appearance Options
            </div>

            {showAdvanced && (
              <div style={{ marginBottom: 16 }}>
                <div className="flex gap-4 mb-4">
                  <div className="flex flex-col gap-2 flex-1">
                    <Label
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.52rem",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: "var(--reho-muted)",
                      }}
                    >
                      <Palette
                        className="inline"
                        style={{ width: 10, height: 10, marginRight: 4 }}
                      />
                      Module Color
                    </Label>
                    <input
                      data-testid="input-module-color"
                      type="color"
                      value={moduleColor}
                      onChange={(e) => setModuleColor(e.target.value)}
                      style={{
                        width: "100%",
                        height: 40,
                        borderRadius: 6,
                        border: "1px solid var(--reho-border)",
                        background: "var(--reho-bg)",
                        cursor: "pointer",
                        padding: 2,
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <Label
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.52rem",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: "var(--reho-muted)",
                      }}
                    >
                      <Palette
                        className="inline"
                        style={{ width: 10, height: 10, marginRight: 4 }}
                      />
                      Background
                    </Label>
                    <input
                      data-testid="input-bg-color"
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      style={{
                        width: "100%",
                        height: 40,
                        borderRadius: 6,
                        border: "1px solid var(--reho-border)",
                        background: "var(--reho-bg)",
                        cursor: "pointer",
                        padding: 2,
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "0.52rem",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "var(--reho-muted)",
                    }}
                  >
                    Output Size (px)
                  </Label>
                  <Input
                    data-testid="input-qr-size"
                    type="number"
                    value={qrSize}
                    onChange={(e) => setQrSize(e.target.value)}
                    min={400}
                    max={2400}
                    step={100}
                    className="reho-input-field"
                    style={{ height: 44 }}
                  />
                  <span
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--reho-muted)",
                      paddingLeft: 4,
                    }}
                  >
                    800 = screen &middot; 1200 = print quality
                  </span>
                </div>
              </div>
            )}

            {generating && (
              <div style={{ marginBottom: 14 }}>
                <span
                  data-testid="text-progress-label"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.65rem",
                    color: "var(--reho-muted)",
                  }}
                >
                  {progressLabel}
                </span>
                <div
                  style={{
                    height: 3,
                    background: "var(--reho-border)",
                    borderRadius: 2,
                    overflow: "hidden",
                    marginTop: 8,
                  }}
                >
                  <div
                    data-testid="progress-bar"
                    style={{
                      height: "100%",
                      background:
                        "linear-gradient(90deg, var(--reho-orange), #ffcc66)",
                      borderRadius: 2,
                      transition: "width 0.15s ease",
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <button
              data-testid="button-generate"
              onClick={handleGenerate}
              disabled={!isValid || generating}
              className="reho-btn-save"
              style={{ marginBottom: 10, gap: 8 }}
            >
              <QrCode style={{ width: 16, height: 16 }} />
              Generate QR Series
            </button>

            <button
              data-testid="button-download-zip"
              onClick={downloadZip}
              disabled={generatedQRs.length === 0 || zipping}
              style={{
                width: "100%",
                height: 46,
                background: "transparent",
                border: "1px solid var(--reho-border)",
                borderRadius: 12,
                color: "var(--reho-text)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor:
                  generatedQRs.length === 0 || zipping
                    ? "not-allowed"
                    : "pointer",
                opacity: generatedQRs.length === 0 || zipping ? 0.35 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 10,
                transition: "all 0.2s",
              }}
            >
              <Download style={{ width: 14, height: 14 }} />
              {zipping ? "Creating ZIP..." : "Download All as ZIP"}
            </button>

            <button
              data-testid="button-clear"
              onClick={clearAll}
              style={{
                width: "100%",
                height: 46,
                background: "transparent",
                border: "1px solid var(--reho-border)",
                borderRadius: 12,
                color: "var(--reho-soft)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s",
              }}
            >
              <Trash2 style={{ width: 14, height: 14 }} />
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div
              className="reho-title"
              style={{ fontSize: "1.1rem" }}
              data-testid="text-preview-title"
            >
              PREVIEW
            </div>
            <Badge
              data-testid="badge-gen-count"
              style={{
                background: "var(--reho-surface2)",
                border: "1px solid var(--reho-border)",
                color: "var(--reho-muted)",
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.65rem",
              }}
              className="no-default-hover-elevate no-default-active-elevate"
            >
              Generated:{" "}
              <span style={{ color: "var(--reho-orange)", fontWeight: 700 }}>
                {generatedQRs.length}
              </span>
            </Badge>
          </div>

          {generatedQRs.length === 0 && (
            <div
              data-testid="container-empty-state"
              style={{
                textAlign: "center",
                padding: "80px 20px",
                color: "var(--reho-muted)",
                border: "1px dashed var(--reho-border)",
                borderRadius: 14,
              }}
            >
              <QrCode
                style={{
                  width: 52,
                  height: 52,
                  opacity: 0.25,
                  marginBottom: 16,
                  display: "inline-block",
                }}
              />
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.7rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  lineHeight: 2,
                }}
              >
                Configure a series
                <br />
                and hit Generate.
                <br />
                <br />
                Each QR renders
                <br />
                in the Reho pill style.
              </p>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 16,
            }}
          >
            {generatedQRs.map((qr, i) => (
              <div
                key={qr.tagId}
                data-testid={`qr-item-${qr.tagId}`}
                style={{
                  background: "var(--reho-surface)",
                  border: "1px solid var(--reho-border)",
                  borderRadius: 12,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  transition: "border-color 0.2s",
                  animation: `fadeUp 0.3s ease both`,
                  animationDelay: `${Math.min(i, 10) * 30}ms`,
                }}
              >
                <img
                  src={qr.dataUrl}
                  alt={`QR code for ${qr.tagId}`}
                  style={{
                    width: 128,
                    height: 128,
                    borderRadius: 8,
                  }}
                />
                <div
                  data-testid={`text-qr-label-${qr.tagId}`}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "var(--reho-orange)",
                    textAlign: "center",
                    wordBreak: "break-all",
                  }}
                >
                  {qr.tagId}
                </div>
                <button
                  data-testid={`button-download-${qr.tagId}`}
                  onClick={() => downloadSingle(qr.tagId)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--reho-border)",
                    borderRadius: 6,
                    padding: "5px 12px",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.6rem",
                    color: "var(--reho-muted)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    letterSpacing: "0.05em",
                  }}
                >
                  <Download
                    className="inline"
                    style={{
                      width: 10,
                      height: 10,
                      marginRight: 4,
                    }}
                  />
                  PNG
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 800px) {
          .grid[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
