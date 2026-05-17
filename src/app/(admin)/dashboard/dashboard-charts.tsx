"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TooltipPayloadEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  mode: "requests" | "renames";
  locale: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  mode,
  locale,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const ts = label ? new Date(label) : null;
  const formatted = ts
    ? mode === "requests"
      ? ts.toLocaleString(locale, {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : ts.toLocaleDateString(locale, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
    : "";
  return (
    <div className="rounded-md border bg-popover p-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{formatted}</div>
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="tabular-nums">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RequestsChartInner({
  data,
  labels,
  locale,
}: {
  data: { ts: string; hit: number; miss: number }[];
  labels: { hit: string; miss: string };
  locale: string;
}) {
  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      initialDimension={{ width: 0, height: 232 }}
    >
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
      >
        <defs>
          <linearGradient id="req-hit" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="hsl(var(--primary))"
              stopOpacity={0.5}
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--primary))"
              stopOpacity={0.05}
            />
          </linearGradient>
          <linearGradient id="req-miss" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="hsl(var(--muted-foreground))"
              stopOpacity={0.45}
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--muted-foreground))"
              stopOpacity={0.05}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="hsl(var(--border))"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="ts"
          tickFormatter={(v: string) =>
            new Date(v).toLocaleTimeString(locale, { hour: "2-digit" })
          }
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          content={<ChartTooltip mode="requests" locale={locale} />}
          cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="hit"
          stackId="r"
          stroke="hsl(var(--primary))"
          fill="url(#req-hit)"
          strokeWidth={1.5}
          name={labels.hit}
        />
        <Area
          type="monotone"
          dataKey="miss"
          stackId="r"
          stroke="hsl(var(--muted-foreground))"
          fill="url(#req-miss)"
          strokeWidth={1.5}
          name={labels.miss}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function RenamesChartInner({
  data,
  label,
  locale,
}: {
  data: { ts: string; count: number }[];
  label: string;
  locale: string;
}) {
  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      initialDimension={{ width: 0, height: 232 }}
    >
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke="hsl(var(--border))"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="ts"
          tickFormatter={(v: string) =>
            new Date(v).toLocaleDateString(locale, {
              day: "2-digit",
              month: "2-digit",
            })
          }
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          minTickGap={20}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          content={<ChartTooltip mode="renames" locale={locale} />}
          cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }}
        />
        <Bar
          dataKey="count"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
          name={label}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
