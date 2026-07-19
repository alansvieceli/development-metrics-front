import type { ReactNode } from "react";
import { METRIC_DEFINITIONS, type MetricKey } from "../metric-definitions";

type ChartCardProps = {
	metricKey: MetricKey;
	children: ReactNode;
};

export function ChartCard({ metricKey, children }: ChartCardProps) {
	const definition = METRIC_DEFINITIONS.find((item) => item.key === metricKey);

	return (
		<div
			data-testid={`metric-chart-${metricKey}`}
			className="flex flex-col gap-2 rounded-xl border border-(--border) bg-(--surface) p-4"
		>
			<h3
				title={definition?.description}
				className="text-sm font-semibold opacity-70"
			>
				{definition?.label ?? metricKey}
			</h3>
			{children}
		</div>
	);
}
