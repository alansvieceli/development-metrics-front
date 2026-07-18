import { describe, expect, it } from "vitest";
import type {
	CompletedTaskMetrics,
	DueDateTaskMetrics,
} from "@/application/metrics/ports/metrics-query-port";
import { calculatePredictability, calculateReworkRate } from "./rate-metrics";

function completedTask(
	overrides: Partial<CompletedTaskMetrics> = {},
): CompletedTaskMetrics {
	return {
		taskId: "task-1",
		createdAt: new Date("2026-07-01T00:00:00Z"),
		completedAt: new Date("2026-07-02T00:00:00Z"),
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
});

describe("calculatePredictability", () => {
	it("retorna null quando não há tasks com dueDate no período", () => {
		expect(calculatePredictability([])).toBeNull();
	});

	it("conta como sucesso a task concluída até o dueDate (inclusive)", () => {
		const tasks: DueDateTaskMetrics[] = [
			{
				taskId: "task-1",
				dueDate: "2026-07-10",
				firstCompletedAt: new Date("2026-07-10T23:59:00Z"),
			},
			{
				taskId: "task-2",
				dueDate: "2026-07-10",
				firstCompletedAt: new Date("2026-07-11T00:00:01Z"),
			},
			{ taskId: "task-3", dueDate: "2026-07-10", firstCompletedAt: null },
		];
		expect(calculatePredictability(tasks)).toBeCloseTo(33.333, 2);
	});
});
