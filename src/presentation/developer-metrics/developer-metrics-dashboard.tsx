import { CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import type { DurationStats } from "@/application/metrics/formulas/duration-metrics";
import type { PeriodType } from "@/application/metrics/period";
import type { MetricsPeriodPreference } from "@/application/metrics/ports/metrics-period-preference-store";
import type { DeveloperMetricEvidence } from "@/application/metrics/use-cases/get-developer-metrics";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import type { Member } from "@/domain/team/entities/member";
import {
	formatDuration,
	formatPercent,
} from "@/presentation/metrics-dashboard/format-metric-value";
import { formatPeriodRangeLabel } from "@/presentation/metrics-dashboard/format-period-label";
import { MetricInfoButton } from "@/presentation/metrics-dashboard/metric-info-button";
import { PeriodFilter } from "@/presentation/metrics-dashboard/period-filter";
import { StatTile } from "@/presentation/metrics-dashboard/stat-tile";
import { DeveloperSelector } from "./developer-selector";

type DeveloperMetricsDashboardProps = {
	teamId: string;
	saveMetricsPeriodPreferenceAction: (
		teamId: string,
		preference: MetricsPeriodPreference,
	) => Promise<void>;
	periodType: PeriodType | "CUSTOM";
	referenceDate: Date;
	members: Member[];
	selectedMember: Member;
	current: HistoricalPeriodMetrics;
	previous: HistoricalPeriodMetrics;
	evidence: DeveloperMetricEvidence;
};

const formatDurationOrEmpty = (stats: DurationStats | null) =>
	stats ? formatDuration(stats.averageMs) : "sem dados";
const formatPercentOrEmpty = (value: number | null) =>
	value === null ? "sem dados" : formatPercent(value);
const nullableCount = (value: number | null) =>
	value === null ? "sem dados" : String(value);

function MetricSection({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-4 rounded-2xl border border-(--border) bg-(--surface) p-4 shadow-[inset_0_3px_0_var(--accent)] sm:p-5">
			<h2 className="text-lg font-semibold">{title}</h2>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
		</section>
	);
}

export function DeveloperMetricsDashboard({
	teamId,
	saveMetricsPeriodPreferenceAction,
	periodType,
	referenceDate,
	members,
	selectedMember,
	current,
	previous,
	evidence,
}: DeveloperMetricsDashboardProps) {
	const periodLabel = formatPeriodRangeLabel(
		current.periodStart,
		current.periodEnd,
	);

	return (
		<div className="flex flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
			<header className="flex flex-col gap-5 border-b border-(--border) pb-6 xl:flex-row xl:items-end xl:justify-between">
				<div className="min-w-0">
					<p className="mb-2 font-mono text-xs font-semibold tracking-[0.2em] text-(--accent) uppercase">
						Visão individual
					</p>
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="text-2xl font-semibold sm:text-3xl">
							Métricas de {selectedMember.name}
						</h1>
						<span className="flex items-center gap-2 rounded-lg border border-(--border) bg-(--surface) px-3 py-1.5 font-mono text-sm font-semibold sm:text-base">
							<CalendarDays
								size={16}
								className="text-(--accent)"
								aria-hidden="true"
							/>
							{periodLabel}
						</span>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2 self-start rounded-xl border border-(--border) bg-(--surface) p-2 xl:self-auto">
					<DeveloperSelector
						members={members}
						selectedMemberId={selectedMember.id}
					/>
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
						customEnd={periodType === "CUSTOM" ? current.periodEnd : undefined}
					/>
					<MetricInfoButton />
				</div>
			</header>

			<MetricSection title="Apoio">
				<StatTile
					metricKey="blockedTime"
					value={formatDurationOrEmpty(current.blockedTime)}
					detail={`Período anterior: ${formatDurationOrEmpty(previous.blockedTime)}`}
					evidence={evidence.blocked}
				/>
				<StatTile
					metricKey="codeReviewTime"
					value={formatDurationOrEmpty(current.codeReviewTime)}
					detail={`Período anterior: ${formatDurationOrEmpty(previous.codeReviewTime)}`}
					evidence={evidence.codeReview}
				/>
				<StatTile
					metricKey="testingTime"
					value={formatDurationOrEmpty(current.testingTime)}
					detail={`Período anterior: ${formatDurationOrEmpty(previous.testingTime)}`}
					evidence={evidence.testing}
				/>
			</MetricSection>

			<MetricSection title="Entrega">
				<StatTile
					metricKey="delivered"
					value={String(current.throughput)}
					detail={`Período anterior: ${previous.throughput}`}
					evidence={evidence.delivered}
				/>
				<StatTile
					metricKey="predictability"
					value={formatPercentOrEmpty(current.predictability)}
					detail={`Período anterior: ${formatPercentOrEmpty(previous.predictability)}`}
					evidence={evidence.predictability}
				/>
				<StatTile
					metricKey="cycleTime"
					value={formatDurationOrEmpty(current.cycleTime)}
					detail={`Período anterior: ${formatDurationOrEmpty(previous.cycleTime)}`}
					evidence={evidence.cycleTime}
				/>
				<StatTile
					metricKey="unplannedCount"
					value={nullableCount(current.unplannedCount)}
					detail={`Período anterior: ${nullableCount(previous.unplannedCount)}`}
					evidence={evidence.unplanned}
				/>
			</MetricSection>

			<MetricSection title="Qualidade">
				<StatTile
					metricKey="reworkCount"
					value={nullableCount(current.reworkCount)}
					detail={`Período anterior: ${nullableCount(previous.reworkCount)}`}
					evidence={evidence.rework}
				/>
				<StatTile
					metricKey="bugsAssociated"
					value={String(current.bugsOpened)}
					detail={`Período anterior: ${previous.bugsOpened}`}
					evidence={evidence.bugsAssociated}
				/>
			</MetricSection>
		</div>
	);
}
