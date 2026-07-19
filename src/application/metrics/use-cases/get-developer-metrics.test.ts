import { describe, expect, it } from "vitest";
import type {
	MetricsQueryPort,
	MetricsSnapshot,
} from "@/application/metrics/ports/metrics-query-port";
import { getDeveloperMetrics } from "./get-developer-metrics";

describe("getDeveloperMetrics", () => {
	it("calcula período anterior e lista as tasks que explicam as métricas", async () => {
		const snapshot: MetricsSnapshot = {
			completionEvents: [
				{
					taskId: "task-anterior",
					externalId: "TASK-ANTERIOR",
					description: "Entrega anterior",
					createdAt: new Date("2026-07-01T00:00:00Z"),
					completedAt: new Date("2026-07-10T00:00:00Z"),
					dueDate: "2026-07-10",
				},
				{
					taskId: "task-atual-1",
					externalId: "TASK-ATUAL-1",
					description: "Entrega atual 1",
					createdAt: new Date("2026-07-15T00:00:00Z"),
					completedAt: new Date("2026-07-20T00:00:00Z"),
					dueDate: "2026-07-20",
				},
				{
					taskId: "task-atual-2",
					externalId: "TASK-ATUAL-2",
					description: "Entrega atual 2",
					createdAt: new Date("2026-07-16T00:00:00Z"),
					completedAt: new Date("2026-07-21T00:00:00Z"),
					dueDate: "2026-08-02",
				},
			],
			statusChanges: [
				{
					taskId: "task-atual-1",
					fromStatus: "TODO",
					toStatus: "IN_DEVELOPMENT",
					changedAt: new Date("2026-07-16T00:00:00Z"),
				},
				{
					taskId: "task-atual-1",
					fromStatus: "IN_DEVELOPMENT",
					toStatus: "CODE_REVIEW",
					changedAt: new Date("2026-07-17T00:00:00Z"),
				},
				{
					taskId: "task-atual-1",
					fromStatus: "CODE_REVIEW",
					toStatus: "IN_DEVELOPMENT",
					changedAt: new Date("2026-07-18T00:00:00Z"),
				},
				{
					taskId: "task-atual-1",
					fromStatus: "IN_DEVELOPMENT",
					toStatus: "TESTING",
					changedAt: new Date("2026-07-19T00:00:00Z"),
				},
				{
					taskId: "task-atual-1",
					fromStatus: "TESTING",
					toStatus: "DONE",
					changedAt: new Date("2026-07-20T00:00:00Z"),
				},
				{
					taskId: "task-atual-2",
					fromStatus: "TODO",
					toStatus: "IN_DEVELOPMENT",
					changedAt: new Date("2026-07-17T00:00:00Z"),
				},
			],
			blockedPeriods: [
				{
					taskId: "task-atual-1",
					blockedAt: new Date("2026-07-16T12:00:00Z"),
					unblockedAt: new Date("2026-07-17T12:00:00Z"),
				},
			],
			dueDateTasks: [
				{
					taskId: "task-anterior",
					externalId: "TASK-ANTERIOR",
					description: "Entrega anterior",
					dueDate: "2026-07-10",
					firstCompletedAt: new Date("2026-07-10T00:00:00Z"),
				},
				{
					taskId: "task-atual-1",
					externalId: "TASK-ATUAL-1",
					description: "Entrega atual 1",
					dueDate: "2026-07-20",
					firstCompletedAt: new Date("2026-07-20T00:00:00Z"),
				},
			],
			currentWipTasks: [],
			bugEvents: [
				{
					taskId: "bug-1",
					createdAt: new Date("2026-07-22T00:00:00Z"),
					parentTaskId: "task-atual-1",
					parentExternalId: "TASK-ATUAL-1",
					parentDescription: "Entrega atual 1",
				},
			],
		};
		let capturedCall: {
			teamId: string;
			assigneeId: string | undefined;
			start: Date;
			end: Date;
		} | null = null;
		const port: MetricsQueryPort = {
			async loadSnapshot(teamId, start, end, assigneeId) {
				capturedCall = { teamId, assigneeId, start, end };
				return snapshot;
			},
		};

		const result = await getDeveloperMetrics(
			port,
			"team-1",
			"member-1",
			new Date("2026-06-28T00:00:00Z"),
			new Date("2026-07-15T00:00:00Z"),
			new Date("2026-08-01T00:00:00Z"),
		);

		expect(capturedCall).toEqual({
			teamId: "team-1",
			assigneeId: "member-1",
			start: new Date("2026-06-28T00:00:00Z"),
			end: new Date("2026-08-01T00:00:00Z"),
		});
		expect(result.current.throughput).toBe(2);
		expect(result.previous.throughput).toBe(1);
		expect(result.evidence.delivered.map((task) => task.externalId)).toEqual([
			"TASK-ATUAL-1",
			"TASK-ATUAL-2",
		]);
		expect(result.evidence.rework.map((task) => task.externalId)).toEqual([
			"TASK-ATUAL-1",
		]);
		expect(result.evidence.blocked.map((task) => task.externalId)).toEqual([
			"TASK-ATUAL-1",
		]);
		expect(result.evidence.bugsAssociated).toEqual([
			{
				taskId: "task-atual-1",
				externalId: "TASK-ATUAL-1",
				description: "Entrega atual 1",
			},
		]);
	});
});
