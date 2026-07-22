import { describe, expect, it } from "vitest";
import type { CompletedTaskMetrics } from "@/application/metrics/ports/metrics-query-port";
import {
	calculateBlockedTime,
	calculateCycleTime,
	calculateCycleTimeOutliers,
	calculateLeadTime,
	calculateTimeInStatus,
	computeDurationStats,
} from "./duration-metrics";

function task(
	overrides: Partial<CompletedTaskMetrics> = {},
): CompletedTaskMetrics {
	return {
		taskId: "task-1",
		externalId: "TASK-1",
		description: "Task de teste",
		createdAt: new Date("2026-07-01T00:00:00Z"),
		completedAt: new Date("2026-07-01T00:00:01Z"),
		dueDate: "2026-07-01",
		statusChanges: [],
		blockedPeriods: [],
		...overrides,
	};
}

describe("computeDurationStats", () => {
	it("retorna null quando não há durações", () => {
		expect(computeDurationStats([])).toBeNull();
	});

	it("calcula média e mediana com quantidade ímpar", () => {
		expect(computeDurationStats([5000, 1000, 3000])).toEqual({
			averageMs: 3000,
			medianMs: 3000,
		});
	});

	it("calcula a mediana como média dos dois valores centrais com quantidade par", () => {
		expect(computeDurationStats([1000, 2000, 4000, 100000])).toEqual({
			averageMs: 26750,
			medianMs: 3000,
		});
	});
});

describe("calculateLeadTime", () => {
	it("retorna null quando não há tasks concluídas", () => {
		expect(calculateLeadTime([])).toBeNull();
	});

	it("calcula lead time como concluído menos criado", () => {
		const tasks = [
			task({
				createdAt: new Date("2026-07-01T00:00:00Z"),
				completedAt: new Date("2026-07-03T00:00:00Z"),
			}),
		];
		expect(calculateLeadTime(tasks)).toEqual({
			averageMs: 2 * 24 * 60 * 60 * 1000,
			medianMs: 2 * 24 * 60 * 60 * 1000,
		});
	});
});

describe("calculateCycleTime", () => {
	it("ignora tasks que nunca entraram em IN_DEVELOPMENT", () => {
		expect(calculateCycleTime([task({ statusChanges: [] })])).toBeNull();
	});

	it("usa a primeira entrada em IN_DEVELOPMENT mesmo havendo retrabalho", () => {
		const tasks = [
			task({
				completedAt: new Date("2026-07-10T00:00:00Z"),
				statusChanges: [
					{
						fromStatus: "TODO",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T00:00:00Z"),
					},
					{
						fromStatus: "IN_DEVELOPMENT",
						toStatus: "CODE_REVIEW",
						changedAt: new Date("2026-07-05T00:00:00Z"),
					},
					{
						fromStatus: "CODE_REVIEW",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-06T00:00:00Z"),
					},
				],
			}),
		];
		expect(calculateCycleTime(tasks)?.averageMs).toBe(9 * 24 * 60 * 60 * 1000);
	});
});

describe("calculateCycleTimeOutliers", () => {
	it("ignora tasks que nunca entraram em IN_DEVELOPMENT", () => {
		expect(calculateCycleTimeOutliers([task({ statusChanges: [] })])).toEqual(
			[],
		);
	});

	it("ordena as tasks pelo maior cycle time e limita a 5", () => {
		const inDevelopmentAt = (date: string) => [
			{
				fromStatus: "TODO" as const,
				toStatus: "IN_DEVELOPMENT" as const,
				changedAt: new Date(date),
			},
		];
		const tasks = [
			task({
				taskId: "t1",
				externalId: "T-1",
				completedAt: new Date("2026-07-10T00:00:00Z"),
				statusChanges: inDevelopmentAt("2026-07-09T00:00:00Z"),
			}),
			task({
				taskId: "t2",
				externalId: "T-2",
				completedAt: new Date("2026-07-20T00:00:00Z"),
				statusChanges: inDevelopmentAt("2026-07-01T00:00:00Z"),
			}),
			task({
				taskId: "t3",
				externalId: "T-3",
				completedAt: new Date("2026-07-12T00:00:00Z"),
				statusChanges: inDevelopmentAt("2026-07-11T00:00:00Z"),
			}),
			task({
				taskId: "t4",
				externalId: "T-4",
				completedAt: new Date("2026-07-14T00:00:00Z"),
				statusChanges: inDevelopmentAt("2026-07-13T00:00:00Z"),
			}),
			task({
				taskId: "t5",
				externalId: "T-5",
				completedAt: new Date("2026-07-16T00:00:00Z"),
				statusChanges: inDevelopmentAt("2026-07-15T00:00:00Z"),
			}),
			task({
				taskId: "t6",
				externalId: "T-6",
				completedAt: new Date("2026-07-18T00:00:00Z"),
				statusChanges: inDevelopmentAt("2026-07-17T00:00:00Z"),
			}),
		];

		const outliers = calculateCycleTimeOutliers(tasks);

		expect(outliers).toHaveLength(5);
		expect(outliers[0]).toEqual({
			taskId: "t2",
			externalId: "T-2",
			cycleTimeMs: 19 * 24 * 60 * 60 * 1000,
		});
		expect(outliers.map((entry) => entry.taskId)).not.toContain("t6");
	});
});

describe("calculateBlockedTime", () => {
	it("retorna null quando não há tasks", () => {
		expect(calculateBlockedTime([], new Date())).toBeNull();
	});

	it("soma múltiplos períodos de bloqueio da mesma task", () => {
		const tasks = [
			task({
				blockedPeriods: [
					{
						blockedAt: new Date("2026-07-01T00:00:00Z"),
						unblockedAt: new Date("2026-07-01T01:00:00Z"),
					},
					{
						blockedAt: new Date("2026-07-02T00:00:00Z"),
						unblockedAt: new Date("2026-07-02T03:00:00Z"),
					},
				],
			}),
		];
		expect(
			calculateBlockedTime(tasks, new Date("2026-07-10T00:00:00Z"))?.averageMs,
		).toBe(4 * 60 * 60 * 1000);
	});

	it("conta período ainda aberto até o momento do cálculo", () => {
		const tasks = [
			task({
				blockedPeriods: [
					{ blockedAt: new Date("2026-07-01T00:00:00Z"), unblockedAt: null },
				],
			}),
		];
		const now = new Date("2026-07-01T02:00:00Z");
		expect(calculateBlockedTime(tasks, now)?.averageMs).toBe(
			2 * 60 * 60 * 1000,
		);
	});
});

describe("calculateTimeInStatus", () => {
	it("soma múltiplas passagens por CODE_REVIEW (retrabalho)", () => {
		const tasks = [
			task({
				statusChanges: [
					{
						fromStatus: "IN_DEVELOPMENT",
						toStatus: "CODE_REVIEW",
						changedAt: new Date("2026-07-01T00:00:00Z"),
					},
					{
						fromStatus: "CODE_REVIEW",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T01:00:00Z"),
					},
					{
						fromStatus: "IN_DEVELOPMENT",
						toStatus: "CODE_REVIEW",
						changedAt: new Date("2026-07-02T00:00:00Z"),
					},
					{
						fromStatus: "CODE_REVIEW",
						toStatus: "DONE",
						changedAt: new Date("2026-07-02T02:00:00Z"),
					},
				],
			}),
		];
		expect(calculateTimeInStatus(tasks, "CODE_REVIEW")?.averageMs).toBe(
			3 * 60 * 60 * 1000,
		);
	});

	it("retorna zero para task que nunca passou pelo status informado", () => {
		expect(
			calculateTimeInStatus([task({ statusChanges: [] })], "CODE_REVIEW"),
		).toEqual({
			averageMs: 0,
			medianMs: 0,
		});
	});

	it("calcula tempo em qualquer status informado", () => {
		const tasks = [
			task({
				statusChanges: [
					{
						fromStatus: "CODE_REVIEW",
						toStatus: "TESTING",
						changedAt: new Date("2026-07-01T00:00:00Z"),
					},
					{
						fromStatus: "TESTING",
						toStatus: "AWAITING_PUBLICATION",
						changedAt: new Date("2026-07-01T02:00:00Z"),
					},
				],
			}),
		];
		expect(calculateTimeInStatus(tasks, "TESTING")?.averageMs).toBe(
			2 * 60 * 60 * 1000,
		);
	});
});
