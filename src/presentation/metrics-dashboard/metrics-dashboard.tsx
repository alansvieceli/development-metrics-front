import { CalendarDays } from "lucide-react";
import Link from "next/link";
import type { PeriodType } from "@/application/metrics/period";
import type { MetricsPeriodPreference } from "@/application/metrics/ports/metrics-period-preference-store";
import type {
	HistoricalPeriodMetrics,
	PeriodMetrics,
} from "@/application/metrics/use-cases/get-metrics-for-period";
import type { Sprint } from "@/domain/sprint/entities/sprint";
import type { Tag } from "@/domain/task/entities/tag";
import { ChartsSection } from "./charts/charts-section";
import { CurrentStatusSection } from "./current-status-section";
import { FlowTimeSection } from "./flow-time-section";
import { formatPeriodRangeLabel } from "./format-period-label";
import { MetricInfoButton } from "./metric-info-button";
import { MetricsSprintFilter } from "./metrics-sprint-filter";
import { PeriodFilter } from "./period-filter";
import { TagFilter } from "./tag-filter";
import { WeekResultSection } from "./week-result-section";

type MetricsDashboardProps = {
	teamId: string;
	saveMetricsPeriodPreferenceAction: (
		teamId: string,
		preference: MetricsPeriodPreference,
	) => Promise<void>;
	periodType: PeriodType | "CUSTOM";
	referenceDate: Date;
	current: PeriodMetrics;
	history: HistoricalPeriodMetrics[];
	tags: Tag[];
	selectedTagIds: string[];
	sprints: Sprint[];
};

export function MetricsDashboard({
	teamId,
	saveMetricsPeriodPreferenceAction,
	periodType,
	referenceDate,
	current,
	history,
	tags,
	selectedTagIds,
	sprints,
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
							{formatPeriodRangeLabel(current.periodStart, current.periodEnd)}
						</span>
					</div>
				</div>
				<div className="flex flex-nowrap items-center gap-2 self-start overflow-x-auto rounded-xl border border-(--border) bg-(--surface) p-2 lg:self-auto">
					<Link
						href="/metrics/developers"
						className="flex h-9 shrink-0 items-center rounded-lg border border-(--border) px-3 text-sm whitespace-nowrap transition-colors hover:bg-white/10"
					>
						Por desenvolvedor
					</Link>
					<MetricsSprintFilter
						sprints={sprints}
						periodFilter={
							<PeriodFilter
								teamId={teamId}
								saveMetricsPeriodPreferenceAction={
									saveMetricsPeriodPreferenceAction
								}
								periodType={periodType}
								referenceDate={referenceDate}
								customStart={
									periodType === "CUSTOM" ? current.periodStart : undefined
								}
								customEnd={
									periodType === "CUSTOM" ? current.periodEnd : undefined
								}
							/>
						}
					/>
					<TagFilter tags={tags} selectedTagIds={selectedTagIds} />
					<MetricInfoButton />
				</div>
			</header>
			<div className="grid items-stretch gap-6 xl:grid-cols-2">
				<CurrentStatusSection wip={current.wip} />
				<WeekResultSection periodType={periodType} current={current} />
			</div>
			<FlowTimeSection current={current} />
			{periodType !== "CUSTOM" ? (
				<ChartsSection
					periodType={periodType}
					current={current}
					history={history}
				/>
			) : null}
		</div>
	);
}
