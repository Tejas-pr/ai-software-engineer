import { useEffect, useState } from "react"
import {
  Activity,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Info,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Sparkles,
  Trash2,
} from "lucide-react"
import { toast } from "@workspace/ui/components/toast"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import {
  getResourceSettings,
  updateResourceSettings,
  pruneStorageCache,
  type ResourceSettingsResponse,
  type ResourceLimitsPayload,
} from "@/api/settings.api"
import { ApplicationBadge } from "@/components/molecules/application/application-badge"
import { ApplicationButton } from "@/components/molecules/application/application-button"
import {
  ApplicationCard,
  ApplicationCardContent,
  ApplicationCardDescription,
  ApplicationCardHeader,
  ApplicationCardTitle,
} from "@/components/molecules/application/application-card"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { ApplicationSelection } from "@/components/molecules/application/application-selection"
import { PageHeader } from "@/components/molecules/common/page-header"

const DEFAULT_LIMITS: ResourceLimitsPayload = {
  ollama_num_gpu: 99,
  ollama_num_thread: 0,
  ollama_vram_budget_gb: 16,
  ollama_keep_alive: "5m",
  max_context_window: 16384,
  max_tokens_per_run: 100000,
  max_run_timeout_seconds: 3600,
  max_concurrent_runs: 2,
  workspace_storage_limit_gb: 20,
  auto_prune_workspaces: true,
}

const GPU_OPTIONS = [
  { value: "99", label: "Full GPU Offload (99 layers — fastest)" },
  { value: "33", label: "Partial GPU Offload (33 layers — balanced)" },
  { value: "0", label: "CPU Only (0 layers — conserve GPU VRAM)" },
]

const KEEP_ALIVE_OPTIONS = [
  { value: "0", label: "0m — Unload immediately after each agent step" },
  { value: "5m", label: "5m — Default (unload after 5 minutes idle)" },
  { value: "15m", label: "15m — Balanced for multi-agent loops" },
  { value: "60m", label: "60m — Extended active programming session" },
  { value: "-1", label: "Forever — Keep hot in VRAM indefinitely" },
]

const CONTEXT_WINDOW_OPTIONS = [
  { value: "8192", label: "8,192 tokens (8K — compact memory)" },
  { value: "16384", label: "16,384 tokens (16K — standard default)" },
  { value: "32768", label: "32,768 tokens (32K — large context)" },
  { value: "65536", label: "65,536 tokens (64K — deep file index)" },
  { value: "131072", label: "131,072 tokens (128K — maximum window)" },
]

const TIMEOUT_OPTIONS = [
  { value: "900", label: "15 minutes (quick tasks)" },
  { value: "1800", label: "30 minutes (standard runs)" },
  { value: "3600", label: "1 hour (deep multi-file features)" },
  { value: "7200", label: "2 hours (extended repository runs)" },
]

export function ResourceSettingsPage() {
  const [data, setData] = useState<ResourceSettingsResponse | null>(null)
  const [limits, setLimits] = useState<ResourceLimitsPayload>(DEFAULT_LIMITS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPruning, setIsPruning] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadSettings = async (showRefreshToast = false) => {
    try {
      const res = await getResourceSettings()
      setData(res)
      setLimits((prev) => ({
        ...DEFAULT_LIMITS,
        ...prev,
        ...(res.limits || {}),
      }))
      if (showRefreshToast) {
        toast.add({
          title: "Hardware telemetry updated",
          type: "success",
        })
      }
    } catch {
      toast.add({
        title: "Could not load hardware resources",
        description: "Check your API connection or credentials.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    let active = true
    getResourceSettings()
      .then((res) => {
        if (!active) return
        setData(res)
        setLimits((prev) => ({
          ...DEFAULT_LIMITS,
          ...prev,
          ...(res.limits || {}),
        }))
        setIsLoading(false)
      })
      .catch(() => {
        if (!active) return
        toast.add({
          title: "Could not load hardware resources",
          description: "Check your API connection or credentials.",
          type: "error",
        })
        setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const updated = await updateResourceSettings(limits)
      setLimits(updated)
      toast.add({
        title: "Resource limits saved",
        description: "Local model allocation and execution guardrails updated.",
        type: "success",
      })
    } catch {
      toast.add({
        title: "Failed to save resource settings",
        description: "Please check values and try again.",
        type: "error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setLimits(DEFAULT_LIMITS)
    toast.add({
      title: "Reset to recommended defaults",
      description: "Click 'Save changes' to commit these values.",
    })
  }

  const handlePruneCache = async () => {
    setIsPruning(true)
    try {
      const res = await pruneStorageCache()
      toast.add({
        title: "Storage cache pruned",
        description: `Cleaned ${res.pruned_runs_count} old run workspace(s), reclaimed ${res.reclaimed_mb} MB. Remaining: ${res.workspaces_remaining_mb} MB.`,
        type: "success",
      })
      await loadSettings()
    } catch {
      toast.add({
        title: "Failed to prune storage cache",
        type: "error",
      })
    } finally {
      setIsPruning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
        <PageHeader
          eyebrow="Settings"
          title="Hardware & Resources"
          description="Manage host hardware allocation, local model inference resources, and workspace storage limits."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const telemetry = data?.telemetry
  const ollama = data?.ollama
  const disk = telemetry?.disk

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          eyebrow="Settings"
          title="Hardware & Resources"
          description="Manage host hardware allocation, local model inference resources, and workspace storage limits."
        />
        <ApplicationButton
          variant="secondary"
          size="sm"
          onClick={() => {
            setIsRefreshing(true)
            loadSettings(true)
          }}
          disabled={isRefreshing}
          iconLeft={
            <RefreshCw
              className={cn("size-3.5", isRefreshing && "animate-spin")}
            />
          }
        >
          Refresh telemetry
        </ApplicationButton>
      </div>

      {/* Telemetry Stat Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* CPU & Arch */}
        <ApplicationCard size="sm" className="relative overflow-hidden">
          <ApplicationCardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
                Compute & CPU
              </span>
              <Cpu className="size-4 text-primary" />
            </div>
            <ApplicationCardTitle className="mt-1 text-lg font-bold">
              {telemetry
                ? `${telemetry.cpu_count ?? telemetry.cpu_cores ?? "—"} Cores`
                : "—"}
            </ApplicationCardTitle>
            <ApplicationCardDescription className="truncate text-2xs">
              {telemetry
                ? `${telemetry.platform ?? "Host"} · ${telemetry.arch ?? telemetry.cpu_arch ?? ""}`
                : "Host hardware"}
            </ApplicationCardDescription>
          </ApplicationCardHeader>
          <ApplicationCardContent className="px-4 pt-1 pb-4">
            <div className="flex items-center gap-1.5 pt-1">
              <ApplicationBadge
                size="sm"
                variant={
                  telemetry?.accelerator && telemetry.accelerator !== "none"
                    ? "default"
                    : "neutral"
                }
                dot
              >
                {telemetry?.accelerator_name ||
                  telemetry?.accelerator ||
                  "CPU Standard"}
              </ApplicationBadge>
            </div>
          </ApplicationCardContent>
        </ApplicationCard>

        {/* System Memory (RAM) */}
        <ApplicationCard size="sm" className="relative overflow-hidden">
          <ApplicationCardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
                Host Memory
              </span>
              <Activity className="size-4 text-primary" />
            </div>
            <ApplicationCardTitle className="mt-1 text-lg font-bold">
              {typeof (
                telemetry?.memory?.total_gb ?? telemetry?.total_ram_gb
              ) === "number"
                ? `${Number(telemetry?.memory?.total_gb ?? telemetry?.total_ram_gb).toFixed(1)} GB`
                : "Host RAM"}
            </ApplicationCardTitle>
            <ApplicationCardDescription className="truncate text-2xs">
              {typeof (
                telemetry?.memory?.available_gb ?? telemetry?.total_ram_gb
              ) === "number"
                ? `${Number(telemetry?.memory?.available_gb ?? telemetry?.total_ram_gb).toFixed(1)} GB available`
                : "System RAM telemetry"}
            </ApplicationCardDescription>
          </ApplicationCardHeader>
          <ApplicationCardContent className="px-4 pt-1 pb-4">
            {typeof telemetry?.memory?.percent_used === "number" && (
              <div className="mt-1 flex flex-col gap-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      (telemetry.memory.percent_used ?? 0) > 85
                        ? "bg-destructive"
                        : (telemetry.memory.percent_used ?? 0) > 70
                          ? "bg-amber-500"
                          : "bg-primary"
                    )}
                    style={{
                      width: `${Math.min(100, telemetry.memory.percent_used ?? 0)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </ApplicationCardContent>
        </ApplicationCard>

        {/* Ollama Engine Status */}
        <ApplicationCard size="sm" className="relative overflow-hidden">
          <ApplicationCardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
                Local Ollama
              </span>
              <Sparkles className="size-4 text-primary" />
            </div>
            <ApplicationCardTitle className="mt-1 text-lg font-bold">
              {ollama?.available || ollama?.reachable
                ? ollama.version
                  ? `v${ollama.version}`
                  : "Online"
                : "Offline"}
            </ApplicationCardTitle>
            <ApplicationCardDescription className="truncate text-2xs">
              {ollama?.available || ollama?.reachable
                ? `${(ollama?.loaded_models ?? ollama?.running_models ?? []).length} model(s) warm in VRAM`
                : "Daemon unreachable on :11434"}
            </ApplicationCardDescription>
          </ApplicationCardHeader>
          <ApplicationCardContent className="px-4 pt-1 pb-4">
            <div className="flex items-center gap-1.5 pt-1">
              <ApplicationBadge
                size="sm"
                variant={
                  ollama?.available || ollama?.reachable
                    ? "default"
                    : "destructive"
                }
                dot
                pulseDot={Boolean(ollama?.available || ollama?.reachable)}
              >
                {ollama?.available || ollama?.reachable
                  ? "Connected"
                  : "Not running"}
              </ApplicationBadge>
            </div>
          </ApplicationCardContent>
        </ApplicationCard>

        {/* Workspace Storage */}
        <ApplicationCard size="sm" className="relative overflow-hidden">
          <ApplicationCardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
                Workspace Storage
              </span>
              <HardDrive className="size-4 text-primary" />
            </div>
            <ApplicationCardTitle className="mt-1 text-lg font-bold">
              {typeof (
                telemetry?.workspaces_used_mb ?? telemetry?.workspaces_size_mb
              ) === "number"
                ? `${Number(telemetry?.workspaces_used_mb ?? telemetry?.workspaces_size_mb).toFixed(1)} MB`
                : "0.0 MB"}
            </ApplicationCardTitle>
            <ApplicationCardDescription className="truncate text-2xs">
              Quota: {limits.workspace_storage_limit_gb} GB
              {typeof (disk?.free_gb ?? telemetry?.disk_free_gb) === "number"
                ? ` (${Number(disk?.free_gb ?? telemetry?.disk_free_gb).toFixed(0)} GB free)`
                : ""}
            </ApplicationCardDescription>
          </ApplicationCardHeader>
          <ApplicationCardContent className="px-4 pt-1 pb-4">
            <div className="mt-1 flex flex-col gap-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-link transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (Number(
                        telemetry?.workspaces_used_mb ??
                          telemetry?.workspaces_size_mb ??
                          0
                      ) /
                        (Math.max(1, limits.workspace_storage_limit_gb) *
                          1024)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </ApplicationCardContent>
        </ApplicationCard>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-8">
        {/* Section 1: Local Model Hardware Acceleration */}
        <ApplicationCard>
          <ApplicationCardHeader>
            <div className="flex items-center gap-2">
              <Server className="size-5 text-primary" />
              <ApplicationCardTitle>
                Local Model Hardware Acceleration
              </ApplicationCardTitle>
            </div>
            <ApplicationCardDescription>
              Configure GPU layers and CPU threads passed to local models via
              Ollama. Adjust to maximize tokens-per-second or reduce host
              resource competition.
            </ApplicationCardDescription>
          </ApplicationCardHeader>

          <ApplicationCardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* GPU Layer Offload */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">
                  GPU Acceleration Offload (Layers)
                </label>
                <ApplicationSelection
                  options={GPU_OPTIONS}
                  value={String(limits.ollama_num_gpu)}
                  onValueChange={(val) => {
                    if (val !== null) {
                      setLimits((prev) => ({
                        ...prev,
                        ollama_num_gpu: parseInt(val, 10),
                      }))
                    }
                  }}
                  indicator="chevron-down"
                />
                <p className="text-2xs text-muted-foreground">
                  Higher layer counts offload more weights to GPU VRAM/Metal
                  unified memory for faster generation.
                </p>
              </div>

              {/* CPU Inference Threads */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">
                  CPU Inference Threads
                </label>
                <ApplicationInput
                  type="number"
                  min={0}
                  max={64}
                  value={limits.ollama_num_thread}
                  onChange={(e) =>
                    setLimits((prev) => ({
                      ...prev,
                      ollama_num_thread: Math.max(
                        0,
                        parseInt(e.target.value, 10) || 0
                      ),
                    }))
                  }
                  placeholder="0 (auto-detect)"
                />
                <p className="text-2xs text-muted-foreground">
                  Set to 0 to let Ollama auto-detect physical CPU cores.
                  Recommended: 0 or equal to physical performance cores.
                </p>
              </div>

              {/* VRAM Budget */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">
                  VRAM Allocation Budget (GB)
                </label>
                <ApplicationInput
                  type="number"
                  min={1}
                  max={128}
                  value={limits.ollama_vram_budget_gb}
                  onChange={(e) =>
                    setLimits((prev) => ({
                      ...prev,
                      ollama_vram_budget_gb: Math.max(
                        1,
                        parseInt(e.target.value, 10) || 16
                      ),
                    }))
                  }
                />
                <p className="text-2xs text-muted-foreground">
                  Maximum video memory allocated for local model weights and KV
                  caches before offloading to system swap.
                </p>
              </div>

              {/* Keep-Alive Duration */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">
                  Model Keep-Alive in Memory
                </label>
                <ApplicationSelection
                  options={KEEP_ALIVE_OPTIONS}
                  value={limits.ollama_keep_alive}
                  onValueChange={(val) => {
                    if (val !== null) {
                      setLimits((prev) => ({
                        ...prev,
                        ollama_keep_alive: val,
                      }))
                    }
                  }}
                  indicator="chevron-down"
                />
                <p className="text-2xs text-muted-foreground">
                  How long the model stays loaded in VRAM after completing an
                  agent step. Prevents repeated loading pauses.
                </p>
              </div>
            </div>
          </ApplicationCardContent>
        </ApplicationCard>

        {/* Section 2: Execution Guardrails & Token Limits */}
        <ApplicationCard>
          <ApplicationCardHeader>
            <div className="flex items-center gap-2">
              <Gauge className="size-5 text-primary" />
              <ApplicationCardTitle>
                Execution Guardrails & Quotas
              </ApplicationCardTitle>
            </div>
            <ApplicationCardDescription>
              Protect your machine and API quotas from runaway loops,
              long-running processes, and excessive token usage.
            </ApplicationCardDescription>
          </ApplicationCardHeader>

          <ApplicationCardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Context Window */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">
                  Maximum Context Window (Tokens)
                </label>
                <ApplicationSelection
                  options={CONTEXT_WINDOW_OPTIONS}
                  value={String(limits.max_context_window)}
                  onValueChange={(val) => {
                    if (val !== null) {
                      setLimits((prev) => ({
                        ...prev,
                        max_context_window: parseInt(val, 10),
                      }))
                    }
                  }}
                  indicator="chevron-down"
                />
                <p className="text-2xs text-muted-foreground">
                  Context window limit passed as num_ctx to local models. Larger
                  windows hold more file context but require more RAM.
                </p>
              </div>

              {/* Max Tokens Per Run */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">
                  Token Budget Per Run
                </label>
                <ApplicationInput
                  type="number"
                  min={1000}
                  max={2000000}
                  step={5000}
                  value={limits.max_tokens_per_run}
                  onChange={(e) =>
                    setLimits((prev) => ({
                      ...prev,
                      max_tokens_per_run: Math.max(
                        1000,
                        parseInt(e.target.value, 10) || 100000
                      ),
                    }))
                  }
                />
                <p className="text-2xs text-muted-foreground">
                  Maximum cumulative tokens allowed across all multi-agent
                  stages for a single task run.
                </p>
              </div>

              {/* Run Timeout */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">
                  Agent Run Execution Timeout
                </label>
                <ApplicationSelection
                  options={TIMEOUT_OPTIONS}
                  value={String(limits.max_run_timeout_seconds)}
                  onValueChange={(val) => {
                    if (val !== null) {
                      setLimits((prev) => ({
                        ...prev,
                        max_run_timeout_seconds: parseInt(val, 10),
                      }))
                    }
                  }}
                  indicator="chevron-down"
                />
                <p className="text-2xs text-muted-foreground">
                  Hard execution timeout before an active run is gracefully
                  aborted to prevent zombie processes.
                </p>
              </div>

              {/* Max Concurrent Runs */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">
                  Concurrent Agent Runs
                </label>
                <ApplicationInput
                  type="number"
                  min={1}
                  max={10}
                  value={limits.max_concurrent_runs}
                  onChange={(e) =>
                    setLimits((prev) => ({
                      ...prev,
                      max_concurrent_runs: Math.max(
                        1,
                        parseInt(e.target.value, 10) || 1
                      ),
                    }))
                  }
                />
                <p className="text-2xs text-muted-foreground">
                  Maximum simultaneous agent pipelines allowed to execute on
                  this host at once.
                </p>
              </div>
            </div>
          </ApplicationCardContent>
        </ApplicationCard>

        {/* Section 3: Storage & Cache Maintenance */}
        <ApplicationCard>
          <ApplicationCardHeader>
            <div className="flex items-center gap-2">
              <Database className="size-5 text-primary" />
              <ApplicationCardTitle>
                Workspace Storage & Sandbox Management
              </ApplicationCardTitle>
            </div>
            <ApplicationCardDescription>
              Each run checks out git trees and generates diffs in
              apps/api/workspaces/. Automatically clean up completed workspaces
              and prune unused temporary files.
            </ApplicationCardDescription>
          </ApplicationCardHeader>

          <ApplicationCardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Storage Limit */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">
                  Storage Limit (GB)
                </label>
                <ApplicationInput
                  type="number"
                  min={1}
                  max={500}
                  value={limits.workspace_storage_limit_gb}
                  onChange={(e) =>
                    setLimits((prev) => ({
                      ...prev,
                      workspace_storage_limit_gb: Math.max(
                        1,
                        parseInt(e.target.value, 10) || 20
                      ),
                    }))
                  }
                />
                <p className="text-2xs text-muted-foreground">
                  Threshold limit for workspaces disk usage before automated
                  warnings or prunes trigger.
                </p>
              </div>

              {/* Auto-Prune Toggle */}
              <div className="flex flex-col justify-center gap-2 pt-2">
                <label className="flex cursor-pointer items-start gap-3 select-none">
                  <input
                    type="checkbox"
                    checked={limits.auto_prune_workspaces}
                    onChange={(e) =>
                      setLimits((prev) => ({
                        ...prev,
                        auto_prune_workspaces: e.target.checked,
                      }))
                    }
                    className="mt-0.5 size-4 cursor-pointer rounded border-border text-primary focus:ring-primary/25"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground">
                      Automatic Daily Workspace Pruning
                    </span>
                    <span className="text-2xs text-muted-foreground">
                      Clean up sandboxed workspace folders for completed or
                      failed runs older than 24 hours.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Manual Pruning Action Box */}
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-foreground">
                    Instant Workspace Cache Clean
                  </span>
                  <span className="text-2xs text-muted-foreground">
                    Delete temporary git worktrees and diffs from terminal runs
                    to reclaim host storage.
                  </span>
                </div>
              </div>

              <ApplicationButton
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePruneCache}
                disabled={isPruning}
                iconLeft={
                  <Trash2
                    className={cn("size-3.5", isPruning && "animate-pulse")}
                  />
                }
              >
                {isPruning ? "Pruning..." : "Prune cache now"}
              </ApplicationButton>
            </div>
          </ApplicationCardContent>
        </ApplicationCard>

        {/* Form Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <ApplicationButton
            type="button"
            variant="secondary"
            size="default"
            onClick={handleReset}
            iconLeft={<RotateCcw className="size-4" />}
          >
            Reset to defaults
          </ApplicationButton>

          <div className="flex items-center gap-3">
            <ApplicationButton
              type="submit"
              variant="primary"
              size="default"
              disabled={isSaving}
              iconLeft={
                isSaving ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )
              }
            >
              {isSaving ? "Saving..." : "Save changes"}
            </ApplicationButton>
          </div>
        </div>
      </form>
    </div>
  )
}
