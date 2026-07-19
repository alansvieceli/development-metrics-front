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
		<section className="flex flex-col gap-5 rounded-2xl border border-(--border) bg-(--surface) p-5 shadow-[inset_0_3px_0_var(--accent)] sm:p-6">
			<div>
				<p className="mb-1 font-mono text-xs font-semibold tracking-[0.16em] text-(--accent) uppercase">
					Histórico
				</p>
				<h2 className="text-lg font-semibold">
					Tendência
					<span className="ml-2 text-sm font-normal text-(--foreground-muted)">
						· {windowLabel}
					</span>
				</h2>
			</div>
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<ThroughputChart history={history} periodType={periodType} />
				<PlannedDeliveredChart history={history} periodType={periodType} />
				<LeadCycleTimeChart history={history} periodType={periodType} />
				<FlowCompositionChart current={current} />
			</div>
		</section>
	);
}
