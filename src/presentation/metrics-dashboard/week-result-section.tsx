import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatPercent } from "./format-metric-value";
import { StatTile } from "./stat-tile";

type WeekResultSectionProps = {
	current: PeriodMetrics;
};

export function WeekResultSection({ current }: WeekResultSectionProps) {
	const counts = current.predictabilityCounts;

	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-sm font-semibold opacity-70">Resultado da semana</h2>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<StatTile
					metricKey="delivered"
					value={counts ? `${counts.delivered}/${counts.planned}` : "sem dados"}
				/>
				<StatTile
					metricKey="predictability"
					value={
						current.predictability === null
							? "sem dados"
							: formatPercent(current.predictability)
					}
				/>
				<StatTile
					metricKey="unplannedCount"
					value={
						current.unplannedCount === null
							? "sem dados"
							: String(current.unplannedCount)
					}
				/>
				<StatTile
					metricKey="reworkCount"
					value={
						current.reworkCount === null
							? "sem dados"
							: `${current.reworkCount} cards`
					}
					secondary={
						current.reworkRate === null
							? undefined
							: `(${formatPercent(current.reworkRate)})`
					}
				/>
			</div>
		</section>
	);
}
