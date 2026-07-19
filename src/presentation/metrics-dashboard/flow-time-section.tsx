import type { DurationStats } from "@/application/metrics/formulas/duration-metrics";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatDuration } from "./format-metric-value";
import type { MetricKey } from "./metric-definitions";
import { StatTile } from "./stat-tile";

type FlowTimeSectionProps = {
	current: PeriodMetrics;
};

function DurationTile({
	metricKey,
	stats,
}: {
	metricKey: MetricKey;
	stats: DurationStats | null;
}) {
	return (
		<StatTile
			metricKey={metricKey}
			value={stats ? formatDuration(stats.averageMs) : "sem dados"}
		/>
	);
}

export function FlowTimeSection({ current }: FlowTimeSectionProps) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-sm font-semibold opacity-70">Tempo do fluxo</h2>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
				<DurationTile metricKey="leadTime" stats={current.leadTime} />
				<DurationTile metricKey="cycleTime" stats={current.cycleTime} />
				<DurationTile
					metricKey="codeReviewTime"
					stats={current.codeReviewTime}
				/>
				<DurationTile metricKey="testingTime" stats={current.testingTime} />
				<DurationTile metricKey="blockedTime" stats={current.blockedTime} />
				<DurationTile
					metricKey="awaitingPublicationTime"
					stats={current.awaitingPublicationTime}
				/>
			</div>
		</section>
	);
}
