import { describe, expect, it } from "vitest";
import type { MetricsSnapshot } from "@/application/metrics/ports/metrics-query-port";
import { getMetricsForRange } from "./get-metrics-for-period";

describe("getMetricsForRange", () => {
	it("monta as métricas do período a partir do snapshot", () => {
		const snapshot: MetricsSnapshot = {
			completionEvents: [
				{
					taskId: "task-1",
					createdAt: new Date("2026-07-01T00:00:00Z"),
					completedAt: new Date("2026-07-03T00:00:00Z"),
				},
			],
			statusChanges: [
				{
					taskId: "task-1",
					fromStatus: "TODO",
					toStatus: "IN_DEVELOPMENT",
					changedAt: new Date("2026-07-01T00:00:00Z"),
				},
			],
			blockedPeriods: [],
			dueDateTasks: [
				{
					taskId: "task-1",
					dueDate: "2026-07-03",
					firstCompletedAt: new Date("2026-07-03T00:00:00Z"),
				},
			],
			wip: 4,
		};
		const start = new Date("2026-07-01T00:00:00Z");
		const end = new Date("2026-07-08T00:00:00Z");

		const metrics = getMetricsForRange(snapshot, start, end);

		expect(metrics.periodStart).toEqual(start);
		expect(metrics.periodEnd).toEqual(end);
		expect(metrics.leadTime?.averageMs).toBe(2 * 86_400_000);
		expect(metrics.cycleTime?.averageMs).toBe(2 * 86_400_000);
		expect(metrics.throughput).toBe(1);
		expect(metrics.predictability).toBe(100);
		expect(metrics).not.toHaveProperty("wip");
	});

	it("retorna vazio/zero quando o período não tem dados", () => {
		const metrics = getMetricsForRange(
			{
				completionEvents: [],
				statusChanges: [],
				blockedPeriods: [],
				dueDateTasks: [],
				wip: 0,
			},
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-07-08T00:00:00Z"),
		);

		expect(metrics.leadTime).toBeNull();
		expect(metrics.cycleTime).toBeNull();
		expect(metrics.blockedTime).toBeNull();
		expect(metrics.codeReviewTime).toBeNull();
		expect(metrics.testingTime).toBeNull();
		expect(metrics.awaitingPublicationTime).toBeNull();
		expect(metrics.reworkRate).toBeNull();
		expect(metrics.throughput).toBe(0);
		expect(metrics.predictability).toBeNull();
	});

	it("card retroativo sem chegar em DONE conta no WIP mas nao em throughput/lead/cycle", () => {
		const snapshot: MetricsSnapshot = {
			completionEvents: [],
			statusChanges: [
				{
					taskId: "task-hist",
					fromStatus: null,
					toStatus: "TODO",
					changedAt: new Date("2026-07-01T00:00:00Z"),
				},
				{
					taskId: "task-hist",
					fromStatus: "TODO",
					toStatus: "TESTING",
					changedAt: new Date("2026-07-05T00:00:00Z"),
				},
			],
			blockedPeriods: [],
			dueDateTasks: [],
			wip: 1,
		};
		const metrics = getMetricsForRange(
			snapshot,
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-07-08T00:00:00Z"),
		);

		expect(metrics.throughput).toBe(0);
		expect(metrics.leadTime).toBeNull();
		expect(metrics.cycleTime).toBeNull();
	});
});
