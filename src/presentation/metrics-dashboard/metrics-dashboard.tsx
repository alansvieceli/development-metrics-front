import type { PeriodType } from "@/application/metrics/period";
import type { MetricsSeriesEntry } from "@/application/metrics/use-cases/get-metrics-dashboard";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
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
				<h1 className="text-xl font-semibold">Métricas</h1>
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
