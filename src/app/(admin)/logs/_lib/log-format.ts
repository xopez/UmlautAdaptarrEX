export interface LogItem {
  level: string;
  message: string;
  context: string | null;
  createdAt: string;
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function parseContext(raw: string | null): Array<[string, string]> {
  if (!raw) return [];
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (!obj || typeof obj !== "object") return [];
    return (
      Object.entries(obj)
        // Drop pid / reqId, they bloat the live view without adding value.
        .filter(([k]) => k !== "pid" && k !== "reqId")
        .map(([k, v]) => {
          const str =
            typeof v === "string"
              ? v
              : typeof v === "number" || typeof v === "boolean" || v === null
                ? String(v)
                : JSON.stringify(v);
          return [k, str.length > 120 ? str.slice(0, 117) + "…" : str] as [
            string,
            string,
          ];
        })
    );
  } catch {
    return [];
  }
}

export function downloadJsonl(rows: LogItem[]): void {
  const lines = rows
    // Oldest first, chronological order reads better than the reversed live view.
    .slice()
    .reverse()
    .map((r) => JSON.stringify(r))
    .join("\n");
  const blob = new Blob([lines + "\n"], { type: "application/x-ndjson" });
  const url = URL.createObjectURL(blob);
  const today = new Date();
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${String(today.getHours()).padStart(2, "0")}${String(today.getMinutes()).padStart(2, "0")}${String(today.getSeconds()).padStart(2, "0")}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `umlautadaptarrex-logs-${stamp}.jsonl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
