import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";

export type SprintMetricsSnapshotRepository = {
	save(sprintId: string, metrics: HistoricalPeriodMetrics): Promise<void>;
	findBySprint(sprintId: string): Promise<HistoricalPeriodMetrics | null>;
};
