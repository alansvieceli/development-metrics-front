import type { PeriodType } from "@/application/metrics/period";
import type { MetricsSeriesEntry } from "@/application/metrics/use-cases/get-metrics-dashboard";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatPeriodLabel } from "./format-period-label";
import { MetricCard } from "./metric-card";
import { METRIC_DEFINITIONS } from "./metric-definitions";
import { MetricInfoButton } from "./metric-info-button";
import { PeriodFilter } from "./period-filter";

const GRID_DEFINITIONS = METRIC_DEFINITIONS.filter(
	(definition) => definition.key !== "wip",
);

type MetricsDashboardProps = {
	periodType: PeriodType;
	referenceDate: Date;
	current: PeriodMetrics;
	weeklySeries: MetricsSeriesEntry[];
	monthlySeries: MetricsSeriesEntry[];
};

export function MetricsDashboard({
	periodType,
	referenceDate,
	current,
	weeklySeries,
	monthlySeries,
}: MetricsDashboardProps) {
	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="grid grid-cols-3 items-center">
				<div className="flex items-center gap-2 justify-self-start">
					<h1 className="text-xl font-semibold">Métricas</h1>
					<span className="text-xl font-semibold text-(--foreground-muted)">
						|
					</span>
					<span className="text-xl font-semibold">
						{formatPeriodLabel(
							periodType,
							current.periodStart,
							current.periodEnd,
						)}
					</span>
				</div>
				<div className="flex h-9 items-center gap-2 justify-self-center rounded-lg border border-(--border) bg-(--surface) px-3">
					<span className="text-xs opacity-70">WIP</span>
					<span className="font-mono text-lg font-semibold">{current.wip}</span>
				</div>
				<div className="flex items-center gap-2 justify-self-end">
					<MetricInfoButton />
					<PeriodFilter periodType={periodType} referenceDate={referenceDate} />
				</div>
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
				{GRID_DEFINITIONS.map((definition) => (
					<MetricCard
						key={definition.key}
						definition={definition}
						periodType={periodType}
						current={current}
						weeklySeries={weeklySeries}
						monthlySeries={monthlySeries}
					/>
				))}
			</div>
		</div>
	);
}
