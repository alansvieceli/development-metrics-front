import type { PeriodType } from "@/application/metrics/period";
import type { MetricsSeriesEntry } from "@/application/metrics/use-cases/get-metrics-dashboard";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatPeriodLabel } from "./format-period-label";
import { MetricCard } from "./metric-card";
import { METRIC_DEFINITIONS } from "./metric-definitions";
import { PeriodFilter } from "./period-filter";

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
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<h1 className="text-xl font-semibold">Métricas</h1>
					<span className="text-sm opacity-70">
						{formatPeriodLabel(
							periodType,
							current.periodStart,
							current.periodEnd,
						)}
					</span>
				</div>
				<PeriodFilter periodType={periodType} referenceDate={referenceDate} />
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
				{METRIC_DEFINITIONS.map((definition) => (
					<MetricCard
						key={definition.key}
						definition={definition}
						current={current}
						weeklySeries={weeklySeries}
						monthlySeries={monthlySeries}
					/>
				))}
			</div>
		</div>
	);
}
