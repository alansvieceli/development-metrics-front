import type { BugEvent } from "@/application/metrics/ports/metrics-query-port";

export type BugRankingEntry = {
	taskId: string;
	externalId: string;
	bugCount: number;
};

const BUG_RANKING_LIMIT = 5;

export function calculateBugsOpened(
	bugEvents: BugEvent[],
	periodStart: Date,
	periodEnd: Date,
): number {
	return bugEvents.filter(
		(event) => event.createdAt >= periodStart && event.createdAt < periodEnd,
	).length;
}

export function calculateBugsRanking(
	bugEvents: BugEvent[],
	periodStart: Date,
	periodEnd: Date,
): BugRankingEntry[] {
	const countByParent = new Map<string, BugRankingEntry>();
	for (const event of bugEvents) {
		if (event.createdAt < periodStart || event.createdAt >= periodEnd) {
			continue;
		}
		if (!event.parentTaskId || !event.parentExternalId) {
			continue;
		}
		const entry = countByParent.get(event.parentTaskId);
		if (entry) {
			entry.bugCount += 1;
		} else {
			countByParent.set(event.parentTaskId, {
				taskId: event.parentTaskId,
				externalId: event.parentExternalId,
				bugCount: 1,
			});
		}
	}
	return [...countByParent.values()]
		.sort((a, b) => b.bugCount - a.bugCount)
		.slice(0, BUG_RANKING_LIMIT);
}
