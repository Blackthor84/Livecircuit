"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const TOOLTIP_STYLE = {
  background: "oklch(0.14 0.025 280)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  fontSize: 12,
};

type ChartType = "area" | "bar" | "line";

export function DemoChartPanel({
  title,
  data,
  type = "area",
  dataKey = "value",
  color = "oklch(0.72 0.19 300)",
  className,
}: {
  title: string;
  data: Record<string, unknown>[];
  type?: ChartType;
  dataKey?: string;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("glass-panel rounded-2xl p-5", className)}>
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="mt-4 h-44 sm:h-52">
        <ResponsiveContainer width="100%" height="100%">
          {type === "area" ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "oklch(0.65 0.02 280)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "oklch(0.65 0.02 280)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#grad-${title})`} strokeWidth={2} />
            </AreaChart>
          ) : type === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "oklch(0.65 0.02 280)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "oklch(0.65 0.02 280)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "oklch(0.65 0.02 280)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "oklch(0.65 0.02 280)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
