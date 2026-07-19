import { describe, expect, it } from "vitest";
import type {
	CompletedTaskMetrics,
	DueDateTaskMetrics,
} from "@/application/metrics/ports/metrics-query-port";
import {
	calculatePredictability,
	calculateReworkCount,
	calculateReworkRate,
	calculateUnplannedCount,
	hasRework,
	isUnplanned,
} from "./rate-metrics";

function completedTask(
	overrides: Partial<CompletedTaskMetrics> = {},
): CompletedTaskMetrics {
	return {
		taskId: "task-1",
		externalId: "TASK-1",
		description: "Task de teste",
		createdAt: new Date("2026-07-01T00:00:00Z"),
		completedAt: new Date("2026-07-02T00:00:00Z"),
		dueDate: "2026-07-01",
		statusChanges: [],
		blockedPeriods: [],
		...overrides,
	};
}

describe("calculateReworkRate", () => {
	it("retorna null quando não há tasks concluídas no período", () => {
		expect(calculateReworkRate([])).toBeNull();
	});

	it("conta uma task com retrabalho apenas uma vez mesmo com múltiplas transições", () => {
		const tasks = [
			completedTask({
				statusChanges: [
					{
						fromStatus: "CODE_REVIEW",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T01:00:00Z"),
					},
					{
						fromStatus: "CODE_REVIEW",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T02:00:00Z"),
					},
				],
			}),
			completedTask({ taskId: "task-2" }),
		];
		expect(calculateReworkRate(tasks)).toBe(50);
	});

	it("considera retrabalho a partir de DONE -> IN_DEVELOPMENT", () => {
		const tasks = [
			completedTask({
				statusChanges: [
					{
						fromStatus: "DONE",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T01:00:00Z"),
					},
				],
			}),
		];
		expect(calculateReworkRate(tasks)).toBe(100);
	});

	it("conta retrabalho a partir de TESTING -> IN_DEVELOPMENT", () => {
		const tasks = [
			completedTask({
				statusChanges: [
					{
						fromStatus: "TESTING",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T01:00:00Z"),
					},
				],
			}),
		];
		expect(calculateReworkRate(tasks)).toBe(100);
	});

	it("conta retrabalho a partir de AWAITING_PUBLICATION -> IN_DEVELOPMENT", () => {
		const tasks = [
			completedTask({
				statusChanges: [
					{
						fromStatus: "AWAITING_PUBLICATION",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T01:00:00Z"),
					},
				],
			}),
		];
		expect(calculateReworkRate(tasks)).toBe(100);
	});

	it("nao conta volta para CODE_REVIEW como retrabalho", () => {
		const tasks = [
			completedTask({
				statusChanges: [
					{
						fromStatus: "TESTING",
						toStatus: "CODE_REVIEW",
						changedAt: new Date("2026-07-01T01:00:00Z"),
					},
				],
			}),
		];
		expect(calculateReworkRate(tasks)).toBe(0);
	});
});

describe("calculateReworkCount", () => {
	it("retorna null quando não há tasks concluídas no período", () => {
		expect(calculateReworkCount([])).toBeNull();
	});

	it("conta quantas tasks tiveram retrabalho", () => {
		const tasks = [
			completedTask({
				statusChanges: [
					{
						fromStatus: "CODE_REVIEW",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T01:00:00Z"),
					},
				],
			}),
			completedTask({ taskId: "task-2" }),
		];
		expect(calculateReworkCount(tasks)).toBe(1);
	});
});

describe("predicados de evidência", () => {
	it("identifica a mesma transição usada no cálculo de retrabalho", () => {
		expect(
			hasRework(
				completedTask({
					statusChanges: [
						{
							fromStatus: "CODE_REVIEW",
							toStatus: "IN_DEVELOPMENT",
							changedAt: new Date("2026-07-01T01:00:00Z"),
						},
					],
				}),
			),
		).toBe(true);
	});

	it("identifica a mesma data usada no cálculo de não planejados", () => {
		expect(
			isUnplanned(
				completedTask({ dueDate: "2026-07-10" }),
				new Date("2026-07-13T00:00:00Z"),
				new Date("2026-07-20T00:00:00Z"),
			),
		).toBe(true);
	});
});

describe("calculateUnplannedCount", () => {
	const periodStart = new Date("2026-07-13T00:00:00Z");
	const periodEnd = new Date("2026-07-20T00:00:00Z");

	it("retorna null quando não há tasks concluídas no período", () => {
		expect(calculateUnplannedCount([], periodStart, periodEnd)).toBeNull();
	});

	it("não conta task cuja dueDate cai dentro do período", () => {
		const tasks = [completedTask({ dueDate: "2026-07-15" })];
		expect(calculateUnplannedCount(tasks, periodStart, periodEnd)).toBe(0);
	});

	it("conta task cuja dueDate cai fora do período", () => {
		const tasks = [
			completedTask({ taskId: "task-1", dueDate: "2026-07-10" }),
			completedTask({ taskId: "task-2", dueDate: "2026-07-25" }),
			completedTask({ taskId: "task-3", dueDate: "2026-07-16" }),
		];
		expect(calculateUnplannedCount(tasks, periodStart, periodEnd)).toBe(2);
	});
});

describe("calculatePredictability", () => {
	it("retorna null quando não há tasks com dueDate no período", () => {
		expect(calculatePredictability([])).toBeNull();
	});

	it("conta como sucesso a task concluída até o dueDate (inclusive)", () => {
		const tasks: DueDateTaskMetrics[] = [
			{
				taskId: "task-1",
				externalId: "TASK-1",
				description: "Task 1",
				dueDate: "2026-07-10",
				firstCompletedAt: new Date("2026-07-10T23:59:00Z"),
			},
			{
				taskId: "task-2",
				externalId: "TASK-2",
				description: "Task 2",
				dueDate: "2026-07-10",
				firstCompletedAt: new Date("2026-07-11T00:00:01Z"),
			},
			{
				taskId: "task-3",
				externalId: "TASK-3",
				description: "Task 3",
				dueDate: "2026-07-10",
				firstCompletedAt: null,
			},
		];
		expect(calculatePredictability(tasks)).toBeCloseTo(33.333, 2);
	});
});
