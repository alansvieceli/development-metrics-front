"use client";

import {
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
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatDuration } from "../format-metric-value";
import { ChartCard } from "./chart-card";
import { toDurationTrendSeries } from "./to-duration-trend-series";

type LeadCycleTimeChartProps = {
	history: HistoricalPeriodMetrics[];
	periodType: PeriodType;
};

export function LeadCycleTimeChart({
	history,
	periodType,
}: LeadCycleTimeChartProps) {
	const data = toDurationTrendSeries(history, periodType);

	return (
		<ChartCard metricKey="leadCycleTimeTrend">
			<ResponsiveContainer width="100%" height={220}>
				<LineChart data={data}>
					<CartesianGrid stroke="var(--border)" vertical={false} />
					<XAxis
						dataKey="label"
						tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
					/>
					<YAxis
						width={44}
						tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
						tickFormatter={(value: number) => formatDuration(value)}
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
							typeof value === "number" ? formatDuration(value) : String(value)
						}
					/>
					<Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
					<Line
						type="monotone"
						dataKey="leadTimeMs"
						name="Lead time"
						stroke="var(--chart-primary)"
						strokeWidth={2}
						dot={{ r: 4 }}
						connectNulls={false}
					/>
					<Line
						type="monotone"
						dataKey="cycleTimeMs"
						name="Cycle time"
						stroke="var(--chart-secondary)"
						strokeWidth={2}
						dot={{ r: 4 }}
						connectNulls={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</ChartCard>
	);
}
