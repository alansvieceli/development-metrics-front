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
import { formatDuration } from "../format-metric-value";
import { ChartCard } from "./chart-card";
import { toFlowCompositionTrend } from "./to-flow-composition-data";

type FlowCompositionChartProps = {
	history: HistoricalPeriodMetrics[];
	periodType: PeriodType;
};

const SEGMENTS = [
	{
		dataKey: "development" as const,
		name: "Desenvolvimento",
		fill: "var(--chart-primary)",
	},
	{
		dataKey: "codeReview" as const,
		name: "Code review",
		fill: "var(--chart-secondary)",
	},
	{
		dataKey: "testing" as const,
		name: "Testes",
		fill: "var(--chart-tertiary)",
	},
	{
		dataKey: "blocked" as const,
		name: "Bloqueado",
		fill: "var(--chart-quaternary)",
	},
	{
		dataKey: "awaitingPublication" as const,
		name: "Aguardando publicação",
		fill: "var(--chart-quinary)",
	},
];

export function FlowCompositionChart({
	history,
	periodType,
}: FlowCompositionChartProps) {
	const data = toFlowCompositionTrend(history, periodType);

	return (
		<ChartCard metricKey="flowComposition">
			{data ? (
				<ResponsiveContainer width="100%" height={220}>
					<BarChart data={data}>
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
								typeof value === "number"
									? formatDuration(value)
									: String(value)
							}
						/>
						<Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
						{SEGMENTS.map((segment) => (
							<Bar
								key={segment.dataKey}
								dataKey={segment.dataKey}
								name={segment.name}
								stackId="flow"
								fill={segment.fill}
							/>
						))}
					</BarChart>
				</ResponsiveContainer>
			) : (
				<p className="text-sm opacity-70">sem dados</p>
			)}
		</ChartCard>
	);
}
