import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";

export type FlowCompositionData = {
	development: number;
	codeReview: number;
	testing: number;
	blocked: number;
	awaitingPublication: number;
};

export function toFlowCompositionData(
	current: PeriodMetrics,
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
