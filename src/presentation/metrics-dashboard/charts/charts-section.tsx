import type { PeriodType } from "@/application/metrics/period";
import type {
	HistoricalPeriodMetrics,
	PeriodMetrics,
} from "@/application/metrics/use-cases/get-metrics-for-period";
import { FlowCompositionChart } from "./flow-composition-chart";
import { LeadCycleTimeChart } from "./lead-cycle-time-chart";
import { PlannedDeliveredChart } from "./planned-delivered-chart";
import { ThroughputChart } from "./throughput-chart";

type ChartsSectionProps = {
	periodType: PeriodType;
	current: PeriodMetrics;
	history: HistoricalPeriodMetrics[];
};

export function ChartsSection({
	periodType,
	current,
	history,
}: ChartsSectionProps) {
	const windowLabel =
		periodType === "WEEK"
			? `últimas ${history.length} semanas`
			: `últimos ${history.length} meses`;

	return (
		<section className="flex flex-col gap-3 border-t border-(--border) pt-6">
			<h2 className="text-sm font-semibold opacity-70">
				Tendência · {windowLabel}
			</h2>
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<ThroughputChart history={history} periodType={periodType} />
				<PlannedDeliveredChart history={history} periodType={periodType} />
				<LeadCycleTimeChart history={history} periodType={periodType} />
				<FlowCompositionChart current={current} />
			</div>
		</section>
	);
}
