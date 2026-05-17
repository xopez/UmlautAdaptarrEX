export interface Instance {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}

export interface SyncRun {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  itemsCount: number;
  pcjonesItemsCount: number;
  tmdbItemsCount: number;
  tvdbItemsCount: number;
  errorMessage?: string | null;
  arrInstance: { name: string; type: string } | null;
}

export interface SyncStartResponse {
  ok: true;
  runIds: string[];
  instanceCount: number;
}

export interface StatsResponse {
  summary: {
    requests24h: number;
    cacheHits24h: number;
    cacheHitRate: number;
    renames24h: number;
    renames14d: number;
  };
  requestsHourly: { ts: string; hit: number; miss: number }[];
  renamesDaily: { ts: string; count: number }[];
}

export interface ProwlarrConfig {
  host: string | null;
  configured: boolean;
}

export function statusVariant(
  status: string,
): "success" | "warning" | "destructive" | "muted" {
  switch (status.toLowerCase()) {
    case "ok":
    case "success":
    case "completed":
      return "success";
    case "running":
    case "queued":
    case "pending":
      return "warning";
    case "failed":
    case "error":
      return "destructive";
    case "cancelled":
    case "canceled":
    case "aborted":
      return "muted";
    default:
      return "muted";
  }
}
