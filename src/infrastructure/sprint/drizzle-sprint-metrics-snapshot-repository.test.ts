import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { programIncrements, sprints } from "./drizzle/schema";
import { drizzleSprintMetricsSnapshotRepository } from "./drizzle-sprint-metrics-snapshot-repository";

const teamId = "00000000-0000-0000-0000-000000000005";

async function seedSprint() {
	const [pi] = await db
		.insert(programIncrements)
		.values({
			teamId,
			name: "PI 2026.3",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		})
		.returning();
	const [sprint] = await db
		.insert(sprints)
		.values({
			piId: pi.id,
			teamId,
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		})
		.returning();
	return { pi, sprint };
}

async function deletePi(id: string) {
	await db.delete(programIncrements).where(eq(programIncrements.id, id));
}

describe("drizzleSprintMetricsSnapshotRepository", () => {
	it("grava e lê o snapshot de métricas de uma sprint", async () => {
		const { pi, sprint } = await seedSprint();
		try {
			await drizzleSprintMetricsSnapshotRepository.save(sprint.id, {
				periodStart: new Date("2026-07-01T00:00:00Z"),
				periodEnd: new Date("2026-07-15T00:00:00Z"),
				leadTime: null,
				cycleTime: null,
				cycleTimeOutliers: [],
				blockedTime: null,
				codeReviewTime: null,
				testingTime: null,
				awaitingPublicationTime: null,
				reworkRate: null,
				reworkCount: null,
				throughput: 3,
				predictability: null,
				predictabilityCounts: null,
				unplannedCount: null,
				bugsOpened: 1,
				bugsRanking: [],
			});
			const found = await drizzleSprintMetricsSnapshotRepository.findBySprint(
				sprint.id,
			);
			expect(found?.throughput).toBe(3);
			expect(found?.bugsOpened).toBe(1);
		} finally {
			await deletePi(pi.id);
		}
	});

	it("retorna null quando não há snapshot para a sprint", async () => {
		expect(
			await drizzleSprintMetricsSnapshotRepository.findBySprint(
				"00000000-0000-0000-0000-000000000000",
			),
		).toBeNull();
	});

	it("reconstrói periodStart e periodEnd como Date ao ler de volta", async () => {
		const { pi, sprint } = await seedSprint();
		try {
			await drizzleSprintMetricsSnapshotRepository.save(sprint.id, {
				periodStart: new Date("2026-07-01T00:00:00Z"),
				periodEnd: new Date("2026-07-15T00:00:00Z"),
				leadTime: null,
				cycleTime: null,
				cycleTimeOutliers: [],
				blockedTime: null,
				codeReviewTime: null,
				testingTime: null,
				awaitingPublicationTime: null,
				reworkRate: null,
				reworkCount: null,
				throughput: 0,
				predictability: null,
				predictabilityCounts: null,
				unplannedCount: null,
				bugsOpened: 0,
				bugsRanking: [],
			});
			const found = await drizzleSprintMetricsSnapshotRepository.findBySprint(
				sprint.id,
			);
			expect(found?.periodStart).toBeInstanceOf(Date);
			expect(found?.periodEnd).toBeInstanceOf(Date);
			expect(found?.periodStart.toISOString()).toBe("2026-07-01T00:00:00.000Z");
		} finally {
			await deletePi(pi.id);
		}
	});
});
