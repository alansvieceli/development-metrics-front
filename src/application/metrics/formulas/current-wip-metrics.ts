import type { CurrentWipTaskMetrics } from "@/application/metrics/ports/metrics-query-port";

export type CurrentWipMetrics = {
	total: number;
	limit: number;
	blocked: number;
	oldestBlockedAgeMs: number | null;
	inReview: number;
	averageReviewAgeMs: number | null;
	inTesting: number;
	oldestTestingAgeMs: number | null;
	inPublication: number;
	oldestPublicationAgeMs: number | null;
};

function ageInMs(date: Date, now: Date): number {
	return Math.max(0, now.getTime() - date.getTime());
}

function oldestAge(dates: Date[], now: Date): number | null {
	return dates.length === 0
		? null
		: Math.max(...dates.map((date) => ageInMs(date, now)));
}

export function calculateCurrentWipMetrics(
	tasks: CurrentWipTaskMetrics[],
	wipLimit: number,
	now: Date = new Date(),
): CurrentWipMetrics {
	const reviewAges = tasks
		.filter((task) => task.status === "CODE_REVIEW")
		.map((task) => ageInMs(task.statusChangedAt, now));

	return {
		total: tasks.length,
		limit: wipLimit,
		blocked: tasks.filter((task) => task.blockedAt !== null).length,
		oldestBlockedAgeMs: oldestAge(
			tasks.flatMap((task) => (task.blockedAt ? [task.blockedAt] : [])),
			now,
		),
		inReview: reviewAges.length,
		averageReviewAgeMs:
			reviewAges.length === 0
				? null
				: reviewAges.reduce((sum, age) => sum + age, 0) / reviewAges.length,
		inTesting: tasks.filter((task) => task.status === "TESTING").length,
		oldestTestingAgeMs: oldestAge(
			tasks
				.filter((task) => task.status === "TESTING")
				.map((task) => task.statusChangedAt),
			now,
		),
		inPublication: tasks.filter(
			(task) => task.status === "AWAITING_PUBLICATION",
		).length,
		oldestPublicationAgeMs: oldestAge(
			tasks
				.filter((task) => task.status === "AWAITING_PUBLICATION")
				.map((task) => task.statusChangedAt),
			now,
		),
	};
}
