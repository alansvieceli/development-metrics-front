"use client";

import { useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { PeriodType } from "@/application/metrics/period";
import { formatDuration, formatPercent } from "./format-metric-value";
import type { TrendPoint } from "./to-trend-points";

type MetricValueFormat = "duration" | "percent" | "count";

type MetricTrendChartProps = {
	variant: "dual-line" | "single-line" | "bar";
	weeklyPoints: TrendPoint[];
	monthlyPoints: TrendPoint[];
	format: MetricValueFormat;
};

function formatAxisLabel(date: Date, granularity: PeriodType): string {
	return granularity === "WEEK"
		? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
		: date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function formatValue(format: MetricValueFormat, value: number): string {
	if (format === "duration") {
		return formatDuration(value);
	}
	if (format === "percent") {
		return formatPercent(value);
	}
	return String(value);
}

export function MetricTrendChart({
	variant,
	weeklyPoints,
	monthlyPoints,
	format,
}: MetricTrendChartProps) {
	const [granularity, setGranularity] = useState<PeriodType>("WEEK");
	const points = granularity === "WEEK" ? weeklyPoints : monthlyPoints;
	const data = points.map((point) => ({
		label: formatAxisLabel(point.periodStart, granularity),
		primary: point.primary,
		secondary: point.secondary,
	}));

	return (
		<div className="flex flex-col gap-2">
			<div className="flex justify-end gap-1 text-xs">
				<button
					type="button"
					onClick={() => setGranularity("WEEK")}
					aria-pressed={granularity === "WEEK"}
					className={`rounded px-2 py-0.5 ${
						granularity === "WEEK"
							? "bg-(--accent) text-(--accent-fg)"
							: "opacity-60"
					}`}
				>
					Semanal
				</button>
				<button
					type="button"
					onClick={() => setGranularity("MONTH")}
					aria-pressed={granularity === "MONTH"}
					className={`rounded px-2 py-0.5 ${
						granularity === "MONTH"
							? "bg-(--accent) text-(--accent-fg)"
							: "opacity-60"
					}`}
				>
					Mensal
				</button>
			</div>
			<ResponsiveContainer width="100%" height={140}>
				{variant === "bar" ? (
					<BarChart data={data}>
						<CartesianGrid stroke="var(--border)" vertical={false} />
						<XAxis
							dataKey="label"
							tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
						/>
						<YAxis
							width={32}
							tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
						/>
						<Tooltip
							contentStyle={{
								background: "var(--surface)",
								border: "1px solid var(--border)",
								borderRadius: 6,
								fontSize: 12,
							}}
							itemStyle={{ color: "var(--foreground)" }}
							labelStyle={{ color: "var(--foreground-muted)" }}
							formatter={(value) =>
								typeof value === "number"
									? formatValue(format, value)
									: String(value)
							}
						/>
						<Bar
							dataKey="primary"
							name="Throughput"
							fill="var(--chart-primary)"
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				) : (
					<LineChart data={data}>
						<CartesianGrid stroke="var(--border)" vertical={false} />
						<XAxis
							dataKey="label"
							tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
						/>
						<YAxis
							width={32}
							tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
						/>
						<Tooltip
							contentStyle={{
								background: "var(--surface)",
								border: "1px solid var(--border)",
								borderRadius: 6,
								fontSize: 12,
							}}
							itemStyle={{ color: "var(--foreground)" }}
							labelStyle={{ color: "var(--foreground-muted)" }}
							formatter={(value) =>
								typeof value === "number"
									? formatValue(format, value)
									: String(value)
							}
						/>
						{variant === "dual-line" ? <Legend /> : null}
						<Line
							type="monotone"
							dataKey="primary"
							name={variant === "dual-line" ? "Média" : "Valor"}
							stroke="var(--chart-primary)"
							strokeWidth={2}
							dot={{ r: 4 }}
							connectNulls
						/>
						{variant === "dual-line" ? (
							<Line
								type="monotone"
								dataKey="secondary"
								name="Mediana"
								stroke="var(--chart-secondary)"
								strokeWidth={2}
								dot={{ r: 4 }}
								connectNulls
							/>
						) : null}
					</LineChart>
				)}
			</ResponsiveContainer>
		</div>
	);
}
