import { CalendarDays } from "lucide-react";
import type { PeriodType } from "@/application/metrics/period";
import type {
	HistoricalPeriodMetrics,
	PeriodMetrics,
} from "@/application/metrics/use-cases/get-metrics-for-period";
import { ChartsSection } from "./charts/charts-section";
import { CurrentStatusSection } from "./current-status-section";
import { FlowTimeSection } from "./flow-time-section";
import { formatPeriodLabel, formatSprintLabel } from "./format-period-label";
import { MetricInfoButton } from "./metric-info-button";
import { PeriodFilter } from "./period-filter";
import { WeekResultSection } from "./week-result-section";

type MetricsDashboardProps = {
	periodType: PeriodType | "SPRINT";
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
		<div className="flex flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
			<header className="flex flex-col gap-5 border-b border-(--border) pb-6 lg:flex-row lg:items-end lg:justify-between">
				<div className="min-w-0">
					<p className="mb-2 font-mono text-xs font-semibold tracking-[0.2em] text-(--accent) uppercase">
						Visão do time
					</p>
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="text-2xl font-semibold sm:text-3xl">Métricas</h1>
						<span className="flex items-center gap-2 rounded-lg border border-(--border) bg-(--surface) px-3 py-1.5 font-mono text-sm font-semibold sm:text-base">
							<CalendarDays
								size={16}
								className="text-(--accent)"
								aria-hidden="true"
							/>
							{periodType === "SPRINT"
								? formatSprintLabel(current.periodStart, current.periodEnd)
								: formatPeriodLabel(
										periodType,
										current.periodStart,
										current.periodEnd,
									)}
						</span>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2 self-start rounded-xl border border-(--border) bg-(--surface) p-2 lg:self-auto">
					<MetricInfoButton />
					<PeriodFilter
						periodType={periodType}
						referenceDate={referenceDate}
						sprintStart={
							periodType === "SPRINT" ? current.periodStart : undefined
						}
						sprintEnd={periodType === "SPRINT" ? current.periodEnd : undefined}
					/>
				</div>
			</header>
			<div className="grid items-stretch gap-6 xl:grid-cols-2">
				<WeekResultSection current={current} />
				<CurrentStatusSection wip={current.wip} />
			</div>
			<FlowTimeSection current={current} />
			{periodType !== "SPRINT" ? (
				<ChartsSection
					periodType={periodType}
					current={current}
					history={history}
				/>
			) : null}
		</div>
	);
}
