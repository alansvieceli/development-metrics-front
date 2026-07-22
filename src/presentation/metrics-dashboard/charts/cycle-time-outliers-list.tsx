import type { CycleTimeOutlier } from "@/application/metrics/formulas/duration-metrics";
import { formatDuration } from "../format-metric-value";
import { ChartCard } from "./chart-card";

type CycleTimeOutliersListProps = {
	outliers: CycleTimeOutlier[];
};

export function CycleTimeOutliersList({
	outliers,
}: CycleTimeOutliersListProps) {
	return (
		<ChartCard metricKey="cycleTimeOutliers">
			{outliers.length === 0 ? (
				<p className="text-sm opacity-70">sem dados</p>
			) : (
				<ol className="flex flex-col gap-2 text-sm">
					{outliers.map((entry) => (
						<li
							key={entry.taskId}
							className="rounded-lg border border-(--border) px-3 py-2"
						>
							#{entry.externalId} — {formatDuration(entry.cycleTimeMs)}
						</li>
					))}
				</ol>
			)}
		</ChartCard>
	);
}
