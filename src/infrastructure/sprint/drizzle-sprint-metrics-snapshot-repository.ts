import { eq } from "drizzle-orm";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import type { SprintMetricsSnapshotRepository } from "@/application/sprint/ports/sprint-metrics-snapshot-repository";
import { db } from "@/infrastructure/db/client";
import { sprintMetricsSnapshots } from "./drizzle/schema";

export const drizzleSprintMetricsSnapshotRepository: SprintMetricsSnapshotRepository =
	{
		async save(sprintId: string, metrics: HistoricalPeriodMetrics) {
			await db
				.insert(sprintMetricsSnapshots)
				.values({ sprintId, metrics })
				.onConflictDoUpdate({
					target: sprintMetricsSnapshots.sprintId,
					set: { metrics },
				});
		},
		async findBySprint(sprintId) {
			const [row] = await db
				.select()
				.from(sprintMetricsSnapshots)
				.where(eq(sprintMetricsSnapshots.sprintId, sprintId));
			return (row?.metrics as HistoricalPeriodMetrics) ?? null;
		},
	};
