"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { PeriodType } from "@/application/metrics/period";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { ChartCard } from "./chart-card";
import { toPlannedDeliveredSeries } from "./to-planned-delivered-series";

type PlannedDeliveredChartProps = {
	history: HistoricalPeriodMetrics[];
	periodType: PeriodType;
};

export function PlannedDeliveredChart({
	history,
	periodType,
}: PlannedDeliveredChartProps) {
	const data = toPlannedDeliveredSeries(history, periodType);

	return (
		<ChartCard metricKey="plannedDeliveredTrend">
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
					<Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
					<Bar
						dataKey="planned"
						name="Planejado"
						fill="var(--chart-primary)"
						radius={[4, 4, 0, 0]}
					/>
					<Bar
						dataKey="delivered"
						name="Entregue"
						fill="var(--chart-secondary)"
						radius={[4, 4, 0, 0]}
					/>
				</BarChart>
			</ResponsiveContainer>
		</ChartCard>
	);
}
