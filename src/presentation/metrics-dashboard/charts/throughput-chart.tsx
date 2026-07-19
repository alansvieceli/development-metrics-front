"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { PeriodType } from "@/application/metrics/period";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { ChartCard } from "./chart-card";
import { toThroughputSeries } from "./to-throughput-series";

type ThroughputChartProps = {
	history: HistoricalPeriodMetrics[];
	periodType: PeriodType;
};

export function ThroughputChart({ history, periodType }: ThroughputChartProps) {
	const data = toThroughputSeries(history, periodType);

	return (
		<ChartCard metricKey="throughputTrend">
			<ResponsiveContainer width="100%" height={220}>
				<BarChart data={data}>
					<CartesianGrid stroke="var(--border)" vertical={false} />
					<XAxis
						dataKey="label"
						tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
					/>
					<YAxis
						width={28}
						allowDecimals={false}
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
					/>
					<Bar
						dataKey="throughput"
						name="Throughput"
						fill="var(--chart-primary)"
						radius={[4, 4, 0, 0]}
					/>
				</BarChart>
			</ResponsiveContainer>
		</ChartCard>
	);
}
