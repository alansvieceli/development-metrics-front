import { describe, expect, it } from "vitest";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import { createFakeSprintMetricsSnapshotRepository } from "@/application/sprint/use-cases/test-helpers/create-fake-sprint-metrics-snapshot-repository";
import { createFakeSprintRepository } from "@/application/sprint/use-cases/test-helpers/create-fake-sprint-repository";
import { getMetricsForSprint } from "./get-metrics-for-sprint";

const emptyMetricsQueryPort: MetricsQueryPort = {
	async loadSnapshot() {
		return {
			completionEvents: [],
			statusChanges: [],
			blockedPeriods: [],
			dueDateTasks: [],
			currentWipTasks: [],
			bugEvents: [],
		};
	},
};

describe("getMetricsForSprint", () => {
	it("rejeita sprint inexistente", async () => {
		const sprintRepository = createFakeSprintRepository();
		const sprintMetricsSnapshotRepository =
			createFakeSprintMetricsSnapshotRepository();
		await expect(
			getMetricsForSprint(
				sprintRepository,
				sprintMetricsSnapshotRepository,
				emptyMetricsQueryPort,
				"sprint-missing",
				"team-1",
				5,
			),
		).rejects.toThrow("Sprint não encontrada");
	});

	it("rejeita sprint de outro time", async () => {
		const sprintRepository = createFakeSprintRepository();
		const sprintMetricsSnapshotRepository =
			createFakeSprintMetricsSnapshotRepository();
		const sprint = await sprintRepository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});
		await expect(
			getMetricsForSprint(
				sprintRepository,
				sprintMetricsSnapshotRepository,
				emptyMetricsQueryPort,
				sprint.id,
				"team-2",
				5,
			),
		).rejects.toThrow("Sprint não encontrada");
	});

	it("calcula ao vivo para sprint ativa, sobre o range da sprint", async () => {
		const sprintRepository = createFakeSprintRepository();
		const sprintMetricsSnapshotRepository =
			createFakeSprintMetricsSnapshotRepository();
		const sprint = await sprintRepository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});
		await sprintRepository.updateStatus(sprint.id, "ACTIVE");

		let receivedRange: { start: Date; end: Date } | undefined;
		const metricsQueryPort: MetricsQueryPort = {
			async loadSnapshot(_teamId, periodStart, periodEnd) {
				receivedRange = { start: periodStart, end: periodEnd };
				return {
					completionEvents: [],
					statusChanges: [],
					blockedPeriods: [],
					dueDateTasks: [],
					currentWipTasks: [],
					bugEvents: [],
				};
			},
		};

		const result = await getMetricsForSprint(
			sprintRepository,
			sprintMetricsSnapshotRepository,
			metricsQueryPort,
			sprint.id,
			"team-1",
			5,
		);

		expect(receivedRange?.start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
		expect(receivedRange?.end.toISOString()).toBe("2026-07-15T00:00:00.000Z");
		expect(result.current.wip.limit).toBe(5);
		expect(result.history).toEqual([]);
	});

	it("calcula ao vivo para sprint planejada", async () => {
		const sprintRepository = createFakeSprintRepository();
		const sprintMetricsSnapshotRepository =
			createFakeSprintMetricsSnapshotRepository();
		const sprint = await sprintRepository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});

		const result = await getMetricsForSprint(
			sprintRepository,
			sprintMetricsSnapshotRepository,
			emptyMetricsQueryPort,
			sprint.id,
			"team-1",
			5,
		);
		expect(result.current.throughput).toBe(0);
	});

	it("lê o snapshot congelado para sprint fechada, com wip zerado", async () => {
		const sprintRepository = createFakeSprintRepository();
		const sprintMetricsSnapshotRepository =
			createFakeSprintMetricsSnapshotRepository();
		const sprint = await sprintRepository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});
		await sprintRepository.updateStatus(sprint.id, "ACTIVE");
		await sprintRepository.updateStatus(sprint.id, "CLOSED");
		await sprintMetricsSnapshotRepository.save(sprint.id, {
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
			throughput: 7,
			predictability: null,
			predictabilityCounts: null,
			unplannedCount: null,
			bugsOpened: 2,
			bugsRanking: [],
		});

		const result = await getMetricsForSprint(
			sprintRepository,
			sprintMetricsSnapshotRepository,
			emptyMetricsQueryPort,
			sprint.id,
			"team-1",
			5,
		);

		expect(result.current.throughput).toBe(7);
		expect(result.current.bugsOpened).toBe(2);
		expect(result.current.wip).toEqual({
			total: 0,
			limit: 5,
			blocked: 0,
			oldestBlockedAgeMs: null,
			inReview: 0,
			averageReviewAgeMs: null,
			inTesting: 0,
			oldestTestingAgeMs: null,
			inPublication: 0,
			oldestPublicationAgeMs: null,
		});
	});

	it("rejeita sprint fechada sem snapshot gravado", async () => {
		const sprintRepository = createFakeSprintRepository();
		const sprintMetricsSnapshotRepository =
			createFakeSprintMetricsSnapshotRepository();
		const sprint = await sprintRepository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});
		await sprintRepository.updateStatus(sprint.id, "ACTIVE");
		await sprintRepository.updateStatus(sprint.id, "CLOSED");

		await expect(
			getMetricsForSprint(
				sprintRepository,
				sprintMetricsSnapshotRepository,
				emptyMetricsQueryPort,
				sprint.id,
				"team-1",
				5,
			),
		).rejects.toThrow("Sprint sem snapshot de métricas");
	});
});
