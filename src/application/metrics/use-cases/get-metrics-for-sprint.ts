import { calculateCurrentWipMetrics } from "@/application/metrics/formulas/current-wip-metrics";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type { SprintMetricsSnapshotRepository } from "@/application/sprint/ports/sprint-metrics-snapshot-repository";
import type { SprintRepository } from "@/application/sprint/ports/sprint-repository";
import type { MetricsDashboardResult } from "./get-metrics-dashboard";
import { getMetricsForRange } from "./get-metrics-for-period";

export async function getMetricsForSprint(
	sprintRepository: SprintRepository,
	sprintMetricsSnapshotRepository: SprintMetricsSnapshotRepository,
	metricsQueryPort: MetricsQueryPort,
	sprintId: string,
	teamId: string,
	wipLimit: number,
): Promise<MetricsDashboardResult> {
	const sprint = await sprintRepository.findById(sprintId);
	if (!sprint || sprint.teamId !== teamId) {
		throw new ApplicationError("Sprint não encontrada");
	}

	if (sprint.status === "CLOSED") {
		const metrics =
			await sprintMetricsSnapshotRepository.findBySprint(sprintId);
		if (!metrics) {
			throw new ApplicationError("Sprint sem snapshot de métricas");
		}
		return {
			current: {
				...metrics,
				wip: {
					total: 0,
					limit: wipLimit,
					blocked: 0,
					oldestBlockedAgeMs: null,
					inReview: 0,
					averageReviewAgeMs: null,
					inTesting: 0,
					oldestTestingAgeMs: null,
					inPublication: 0,
					oldestPublicationAgeMs: null,
				},
			},
			history: [],
		};
	}

	const periodStart = parseDateOnly(sprint.startDate) as Date;
	const endDate = parseDateOnly(sprint.endDate) as Date;
	const periodEnd = new Date(
		Date.UTC(
			endDate.getUTCFullYear(),
			endDate.getUTCMonth(),
			endDate.getUTCDate() + 1,
		),
	);
	const snapshot = await metricsQueryPort.loadSnapshot(
		teamId,
		periodStart,
		periodEnd,
	);
	const now = new Date();
	const current = getMetricsForRange(snapshot, periodStart, periodEnd, now);
	return {
		current: {
			...current,
			wip: calculateCurrentWipMetrics(snapshot.currentWipTasks, wipLimit, now),
		},
		history: [],
	};
}
