"use client";

import { useCallback, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageImage {
  page: number;
  data: string;
  media_type: string;
  placeholder?: boolean;
}

interface DataRow {
  label: string;
  value?: number | string;
  values?: Record<string, number | string>;
}

interface ChartData {
  id: number;
  type: string;
  title: string;
  unit?: string;
  series?: string[];
  data: DataRow[];
}

interface ExtractionResult {
  has_charts: boolean;
  confidence: number;
  charts: ChartData[];
}

interface UploadResult {
  filename: string;
  total_pages: number;
  images: PageImage[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = "http://localhost:8000";

const CHART_TYPE_LABELS: Record<string, string> = {
  bar: "Bar Chart",
  horizontal_bar: "Horizontal Bar",
  stacked_bar: "Stacked Bar",
  stacked_horizontal_bar: "Stacked Horizontal Bar",
  grouped_bar: "Grouped Bar",
  pie: "Pie Chart",
  donut: "Donut Chart",
  line: "Line Chart",
  area: "Area Chart",
  scatter: "Scatter Plot",
};

// ---------------------------------------------------------------------------
// Small helper components
// ---------------------------------------------------------------------------

function Spinner({ size = 5 }: { size?: number }) {
  return (
    <span
      className={`inline-block w-${size} h-${size} border-2 border-current border-t-transparent rounded-full animate-spin`}
    />
  );
}

function Badge({ children, color = "blue" }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-900/50 text-blue-300 border-blue-700",
    green: "bg-green-900/50 text-green-300 border-green-700",
    yellow: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
    gray: "bg-gray-800 text-gray-400 border-gray-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[color]}`}>
      {children}
    </span>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
      <span>⚠</span>
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-200 ml-1">✕</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload / Landing screen
// ---------------------------------------------------------------------------

function LandingScreen({
  onFile,
  isUploading,
  error,
  onDismissError,
}: {
  onFile: (f: File) => void;
  isUploading: boolean;
  error: string | null;
  onDismissError: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Chart Data Extractor
          </h1>
          <p className="text-gray-400 text-lg">
            Upload a document with charts. Get structured data — instantly.
          </p>
        </div>

        {error && <ErrorBanner message={error} onDismiss={onDismissError} />}

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-150 ${
            isDragging
              ? "border-blue-400 bg-blue-900/20 scale-[1.01]"
              : "border-gray-700 hover:border-gray-500 bg-gray-900/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Spinner size={10} />
              <p className="text-lg">Processing file…</p>
              <p className="text-sm text-gray-600">Converting pages to images</p>
            </div>
          ) : (
            <>
              <div className="text-6xl mb-4">📊</div>
              <p className="text-xl text-white mb-2 font-medium">Drop your file here</p>
              <p className="text-gray-400 mb-6">or click to browse</p>
              <p className="text-sm text-gray-500">
                PDF · PNG · JPG · PPTX &nbsp;·&nbsp; Max 50 MB
              </p>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.pptx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />

        {/* Feature pills */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "🔍", title: "Auto-detect", desc: "Charts identified automatically" },
            { icon: "✏️", title: "Review & Edit", desc: "Fix any extraction errors" },
            { icon: "📥", title: "Export", desc: "Excel · CSV · JSON" },
          ].map((f) => (
            <div
              key={f.title}
              className="p-4 bg-gray-900 rounded-xl border border-gray-800 text-center"
            >
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-white text-sm font-medium">{f.title}</div>
              <div className="text-gray-500 text-xs mt-0.5">{f.desc}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-600 text-xs">
          Powered by Claude Opus 4.6 vision ·{" "}
          <span className="text-gray-500">Backend must be running on localhost:8000</span>
        </p>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Editable data table for a single chart
// ---------------------------------------------------------------------------

function ChartTable({
  chart,
  onUpdate,
}: {
  chart: ChartData;
  onUpdate: (updated: ChartData) => void;
}) {
  const { series = [], data } = chart;
  const isMulti = series.length > 0;

  const updateLabel = (rowIdx: number, val: string) => {
    const updated = JSON.parse(JSON.stringify(chart)) as ChartData;
    updated.data[rowIdx].label = val;
    onUpdate(updated);
  };

  const updateValue = (rowIdx: number, key: string, raw: string) => {
    const updated = JSON.parse(JSON.stringify(chart)) as ChartData;
    const num = parseFloat(raw);
    const coerced = raw === "" ? "" : isNaN(num) ? raw : num;
    if (key === "__value") {
      updated.data[rowIdx].value = coerced;
    } else {
      if (!updated.data[rowIdx].values) updated.data[rowIdx].values = {};
      updated.data[rowIdx].values![key] = coerced;
    }
    onUpdate(updated);
  };

  const updateTitle = (val: string) => {
    const updated = { ...chart, title: val };
    onUpdate(updated);
  };

  const confidence = typeof chart === "object" ? undefined : undefined;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Chart header */}
      <div className="px-4 py-3 bg-gray-800/60 border-b border-gray-700 flex items-start justify-between gap-3">
        <div className="flex-1">
          <input
            value={chart.title || ""}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="Chart title"
            className="editable-cell text-white font-semibold text-sm w-full"
          />
          <div className="flex gap-2 mt-1">
            <span className="text-xs text-gray-500 capitalize">
              {CHART_TYPE_LABELS[chart.type] ?? chart.type.replace(/_/g, " ")}
            </span>
            {chart.unit && (
              <span className="text-xs text-gray-500">· Unit: {chart.unit}</span>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-600 shrink-0">
          {data.length} row{data.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800/40 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-2 font-medium">Category</th>
              {isMulti
                ? series.map((s) => (
                    <th key={s} className="text-right px-4 py-2 font-medium">
                      {s}
                    </th>
                  ))
                : (
                    <th className="text-right px-4 py-2 font-medium">
                      {chart.unit ? `Value (${chart.unit})` : "Value"}
                    </th>
                  )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr
                key={ri}
                className="border-t border-gray-800/70 hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-4 py-1.5">
                  <input
                    value={row.label ?? ""}
                    onChange={(e) => updateLabel(ri, e.target.value)}
                    className="editable-cell text-gray-200"
                  />
                </td>
                {isMulti
                  ? series.map((s) => (
                      <td key={s} className="px-4 py-1.5">
                        <input
                          value={row.values?.[s] ?? ""}
                          onChange={(e) => updateValue(ri, s, e.target.value)}
                          className="editable-cell text-gray-200 text-right"
                        />
                      </td>
                    ))
                  : (
                      <td className="px-4 py-1.5">
                        <input
                          value={row.value ?? ""}
                          onChange={(e) => updateValue(ri, "__value", e.target.value)}
                          className="editable-cell text-gray-200 text-right"
                        />
                      </td>
                    )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedPage, setSelectedPage] = useState(0);
  const [extractions, setExtractions] = useState<Record<number, ExtractionResult>>({});
  // editingCharts mirrors extractions.charts but allows user edits
  const [editingCharts, setEditingCharts] = useState<Record<number, ChartData[]>>({});
  const [error, setError] = useState<string | null>(null);

  // ---- File handling ----

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "png", "jpg", "jpeg", "webp", "pptx"].includes(ext)) {
      setError(`Unsupported type ".${ext}". Supported: PDF, PNG, JPG, WEBP, PPTX`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File exceeds 50 MB limit.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);
    setExtractions({});
    setEditingCharts({});
    setSelectedPage(0);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `Server returned ${res.status}`);
      }
      const data: UploadResult = await res.json();
      setUploadResult(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(`${msg}. Is the backend running? (cd backend && uvicorn main:app --reload)`);
    } finally {
      setIsUploading(false);
    }
  }, []);

  // ---- Extract ----

  const extractCharts = async () => {
    if (!uploadResult) return;
    const img = uploadResult.images[selectedPage];
    if (!img || !img.data) {
      setError("No image data for this page. Try a different slide.");
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img.data, media_type: img.media_type }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `Server error ${res.status}`);
      }
      const data: ExtractionResult = await res.json();
      setExtractions((prev) => ({ ...prev, [selectedPage]: data }));
      setEditingCharts((prev) => ({
        ...prev,
        [selectedPage]: JSON.parse(JSON.stringify(data.charts)),
      }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setIsExtracting(false);
    }
  };

  // ---- Export ----

  const allCharts = Object.values(editingCharts).flat();

  const exportData = async (format: "xlsx" | "csv" | "json") => {
    if (allCharts.length === 0) {
      setError("No extracted charts to export. Run extraction first.");
      return;
    }
    setExportLoading(format);
    try {
      const res = await fetch(`${API_BASE}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          charts: allCharts,
          format,
          filename: uploadResult?.filename.replace(/\.[^.]+$/, "") ?? "chart_data",
        }),
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chart_data.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportLoading(null);
    }
  };

  // ---- Chart edit ----

  const updateChart = (pageIdx: number, chartIdx: number, updated: ChartData) => {
    setEditingCharts((prev) => {
      const clone = JSON.parse(JSON.stringify(prev)) as Record<number, ChartData[]>;
      if (clone[pageIdx]) clone[pageIdx][chartIdx] = updated;
      return clone;
    });
  };

  // ---- Derived ----

  const currentImg = uploadResult?.images[selectedPage];
  const currentExtraction = extractions[selectedPage];
  const currentCharts = editingCharts[selectedPage] ?? [];
  const totalExtracted = allCharts.length;
  const totalPages = uploadResult?.total_pages ?? 0;

  // ---- Landing ----

  if (!uploadResult) {
    return (
      <LandingScreen
        onFile={handleFile}
        isUploading={isUploading}
        error={error}
        onDismissError={() => setError(null)}
      />
    );
  }

  // ---- Main workspace ----

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      {/* ---- Header ---- */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              setUploadResult(null);
              setExtractions({});
              setEditingCharts({});
              setError(null);
            }}
            className="text-gray-400 hover:text-white transition-colors text-sm shrink-0"
          >
            ← New file
          </button>
          <span className="text-white font-medium truncate text-sm">
            {uploadResult.filename}
          </span>
          <Badge color="gray">{totalPages} page{totalPages !== 1 ? "s" : ""}</Badge>
          {totalExtracted > 0 && (
            <Badge color="green">
              {totalExtracted} chart{totalExtracted !== 1 ? "s" : ""} extracted
            </Badge>
          )}
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {(["xlsx", "csv", "json"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => exportData(fmt)}
              disabled={totalExtracted === 0 || exportLoading !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500
                         disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs
                         rounded-lg transition-colors font-medium"
            >
              {exportLoading === fmt ? <Spinner size={3} /> : <span>↓</span>}
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-5 pt-3 shrink-0">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* ---- Body ---- */}
      <div className="flex flex-1 min-h-0">
        {/* Page thumbnail sidebar (only if multi-page) */}
        {totalPages > 1 && (
          <aside className="w-28 bg-gray-900 border-r border-gray-800 overflow-y-auto shrink-0 p-2 flex flex-col gap-2">
            {uploadResult.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedPage(i)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                  selectedPage === i
                    ? "border-blue-500 shadow-lg shadow-blue-900/40"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                {img.data ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:${img.media_type};base64,${img.data}`}
                    alt={`Page ${i + 1}`}
                    className="w-full object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[3/4] bg-gray-800 flex items-center justify-center text-gray-600 text-xs">
                    Slide {i + 1}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-center text-xs text-gray-300 py-0.5">
                  {i + 1}
                </div>
                {extractions[i]?.has_charts && (
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-400 rounded-full shadow" />
                )}
              </button>
            ))}
          </aside>
        )}

        {/* Image viewer */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-900">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 shrink-0">
            <span className="text-gray-400 text-sm">
              Page {selectedPage + 1} of {totalPages}
              {currentExtraction && (
                <span className="ml-2 text-xs text-gray-600">
                  · confidence {Math.round(currentExtraction.confidence * 100)}%
                </span>
              )}
            </span>
            <button
              onClick={extractCharts}
              disabled={isExtracting || !currentImg?.data}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500
                         disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm
                         rounded-lg transition-colors font-medium"
            >
              {isExtracting ? (
                <>
                  <Spinner size={3} />
                  Analyzing with AI…
                </>
              ) : (
                <>🔍 Extract Charts</>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-auto flex items-start justify-center p-4">
            {currentImg?.data ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:${currentImg.media_type};base64,${currentImg.data}`}
                alt={`Page ${selectedPage + 1}`}
                className="max-w-full rounded shadow-2xl"
                style={{ maxHeight: "calc(100vh - 130px)" }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <div className="text-5xl mb-3">🖼</div>
                <p>No preview available for this slide.</p>
                <p className="text-sm mt-1">
                  PPTX slides with native chart objects cannot be rendered directly.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Extraction results panel */}
        <div className="w-[460px] shrink-0 border-l border-gray-800 flex flex-col bg-gray-950 min-h-0">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 shrink-0">
            <h2 className="text-white font-semibold text-sm">Extracted Data</h2>
            {currentExtraction && (
              <span className="text-xs text-gray-500">
                Click any cell to edit
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Empty state */}
            {!currentExtraction && !isExtracting && (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="text-5xl mb-4">📊</div>
                <p className="text-gray-300 font-medium mb-1">No extraction yet</p>
                <p className="text-gray-500 text-sm">
                  Click <strong className="text-gray-400">Extract Charts</strong> to analyse this page
                </p>
              </div>
            )}

            {/* Loading */}
            {isExtracting && (
              <div className="flex flex-col items-center justify-center h-full py-16">
                <Spinner size={10} />
                <p className="text-gray-400 mt-4">Analysing with Claude…</p>
                <p className="text-gray-600 text-xs mt-1">This may take a few seconds</p>
              </div>
            )}

            {/* Results */}
            {currentExtraction && !isExtracting && (
              <>
                {/* Status row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {currentExtraction.has_charts ? (
                    <Badge color="green">
                      ✓ {currentExtraction.charts.length} chart{currentExtraction.charts.length !== 1 ? "s" : ""} found
                    </Badge>
                  ) : (
                    <Badge color="yellow">No charts detected on this page</Badge>
                  )}
                  <button
                    onClick={extractCharts}
                    className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2"
                  >
                    Re-run
                  </button>
                </div>

                {currentExtraction.has_charts && currentCharts.length === 0 && (
                  <p className="text-gray-500 text-sm">
                    Charts were found but data could not be parsed. Try re-running.
                  </p>
                )}

                {/* Chart tables */}
                {currentCharts.map((chart, ci) => (
                  <ChartTable
                    key={`${selectedPage}-${ci}`}
                    chart={chart}
                    onUpdate={(updated) => updateChart(selectedPage, ci, updated)}
                  />
                ))}
              </>
            )}
          </div>

          {/* Export summary footer */}
          {totalExtracted > 0 && (
            <div className="px-4 py-3 border-t border-gray-800 shrink-0 bg-gray-900/50">
              <p className="text-xs text-gray-500 mb-2">
                Export all {totalExtracted} chart{totalExtracted !== 1 ? "s" : ""} from this document:
              </p>
              <div className="flex gap-2">
                {(["xlsx", "csv", "json"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => exportData(fmt)}
                    disabled={exportLoading !== null}
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50
                               text-gray-200 text-xs rounded-lg transition-colors font-medium border border-gray-700"
                  >
                    {exportLoading === fmt ? "…" : `↓ ${fmt.toUpperCase()}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
