import type { PeriodType } from "@/application/metrics/period";
import type {
	HistoricalPeriodMetrics,
	PeriodMetrics,
} from "@/application/metrics/use-cases/get-metrics-for-period";
import { ChartsSection } from "./charts/charts-section";
import { CurrentStatusSection } from "./current-status-section";
import { FlowTimeSection } from "./flow-time-section";
import { formatPeriodLabel } from "./format-period-label";
import { MetricInfoButton } from "./metric-info-button";
import { PeriodFilter } from "./period-filter";
import { WeekResultSection } from "./week-result-section";

type MetricsDashboardProps = {
	periodType: PeriodType;
	referenceDate: Date;
	current: PeriodMetrics;
	history: HistoricalPeriodMetrics[];
};

export function MetricsDashboard({
	periodType,
	referenceDate,
	current,
	history,
}: MetricsDashboardProps) {
	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
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
				<div className="flex items-center gap-2">
					<MetricInfoButton />
					<PeriodFilter periodType={periodType} referenceDate={referenceDate} />
				</div>
			</div>
			<CurrentStatusSection wip={current.wip} />
			<WeekResultSection current={current} />
			<FlowTimeSection current={current} />
			<ChartsSection periodType={periodType} current={current} history={history} />
		</div>
	);
}
