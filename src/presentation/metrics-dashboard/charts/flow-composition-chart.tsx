"use client";

import {
	Bar,
	BarChart,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatDuration } from "../format-metric-value";
import { ChartCard } from "./chart-card";
import { toFlowCompositionData } from "./to-flow-composition-data";

type FlowCompositionChartProps = {
	current: PeriodMetrics;
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

export function FlowCompositionChart({ current }: FlowCompositionChartProps) {
	const data = toFlowCompositionData(current);

	return (
		<ChartCard metricKey="flowComposition">
			{data ? (
				<ResponsiveContainer width="100%" height={110}>
					<BarChart
						layout="vertical"
						data={[{ name: "Cycle time", ...data }]}
						margin={{ left: 0, right: 16 }}
					>
						<XAxis
							type="number"
							tickFormatter={(value: number) => formatDuration(value)}
							tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
						/>
						<YAxis type="category" dataKey="name" hide />
						<Tooltip
							contentStyle={{
								background: "var(--surface)",
								border: "1px solid var(--border)",
								borderRadius: 6,
								fontSize: 12,
							}}
							itemStyle={{ color: "var(--foreground)" }}
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
