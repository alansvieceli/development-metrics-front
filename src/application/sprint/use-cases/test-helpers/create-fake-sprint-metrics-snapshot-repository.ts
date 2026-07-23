import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import type { SprintMetricsSnapshotRepository } from "@/application/sprint/ports/sprint-metrics-snapshot-repository";

export function createFakeSprintMetricsSnapshotRepository(): SprintMetricsSnapshotRepository {
	const store = new Map<string, HistoricalPeriodMetrics>();

	return {
		async save(sprintId, metrics) {
			store.set(sprintId, metrics);
		},
		async findBySprint(sprintId) {
			return store.get(sprintId) ?? null;
		},
	};
}
