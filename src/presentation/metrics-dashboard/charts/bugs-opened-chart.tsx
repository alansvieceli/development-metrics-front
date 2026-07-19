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
import { toBugsOpenedSeries } from "./to-bugs-opened-series";

type BugsOpenedChartProps = {
	history: HistoricalPeriodMetrics[];
	periodType: PeriodType;
};

export function BugsOpenedChart({ history, periodType }: BugsOpenedChartProps) {
	const data = toBugsOpenedSeries(history, periodType);

	return (
		<ChartCard metricKey="bugsOpenedTrend">
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
						dataKey="bugsOpened"
						name="Bugs abertos"
						fill="var(--chart-primary)"
						radius={[4, 4, 0, 0]}
					/>
				</BarChart>
			</ResponsiveContainer>
		</ChartCard>
	);
}
