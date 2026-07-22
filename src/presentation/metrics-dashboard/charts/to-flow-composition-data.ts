import type { PeriodType } from "@/application/metrics/period";
import type {
	HistoricalPeriodMetrics,
	PeriodMetrics,
} from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatPeriodShortLabel } from "../format-period-label";

export type FlowCompositionData = {
	development: number;
	codeReview: number;
	testing: number;
	blocked: number;
	awaitingPublication: number;
};

const EMPTY_FLOW_COMPOSITION: FlowCompositionData = {
	development: 0,
	codeReview: 0,
	testing: 0,
	blocked: 0,
	awaitingPublication: 0,
};

export function toFlowCompositionData(
	current: PeriodMetrics | HistoricalPeriodMetrics,
): FlowCompositionData | null {
	if (!current.cycleTime) {
		return null;
	}
	const codeReview = current.codeReviewTime?.averageMs ?? 0;
	const testing = current.testingTime?.averageMs ?? 0;
	const blocked = current.blockedTime?.averageMs ?? 0;
	const awaitingPublication = current.awaitingPublicationTime?.averageMs ?? 0;
	const development = Math.max(
		current.cycleTime.averageMs -
			(codeReview + testing + blocked + awaitingPublication),
		0,
	);
	return { development, codeReview, testing, blocked, awaitingPublication };
}

export type FlowCompositionTrendPoint = FlowCompositionData & {
	label: string;
};

export function toFlowCompositionTrend(
	history: HistoricalPeriodMetrics[],
	periodType: PeriodType,
): FlowCompositionTrendPoint[] | null {
	const hasData = history.some((entry) => entry.cycleTime !== null);
	if (!hasData) {
		return null;
	}
	return history.map((entry) => ({
		label: formatPeriodShortLabel(periodType, entry.periodStart),
		...(toFlowCompositionData(entry) ?? EMPTY_FLOW_COMPOSITION),
	}));
}
