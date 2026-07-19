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
			className="flex min-w-0 flex-col gap-3 rounded-xl border border-(--border) bg-(--background) p-5"
		>
			<h3
				title={definition?.description}
				className="text-sm font-semibold text-(--foreground-muted)"
			>
				{definition?.label ?? metricKey}
			</h3>
			{children}
		</div>
	);
}
