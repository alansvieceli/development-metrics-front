import { Info } from "lucide-react";
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
				className="flex items-center gap-1.5 text-sm font-semibold text-(--foreground-muted) cursor-help"
			>
				{definition?.label ?? metricKey}
				{definition?.description ? (
					<Info size={13} aria-hidden="true" className="opacity-60" />
				) : null}
			</h3>
			{children}
		</div>
	);
}
