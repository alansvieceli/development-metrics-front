import { describe, expect, it } from "vitest";
import type {
	MetricsQueryPort,
	MetricsSnapshot,
} from "@/application/metrics/ports/metrics-query-port";
import { getMetricsDashboard } from "./get-metrics-dashboard";

describe("getMetricsDashboard", () => {
	it("calcula o dashboard inteiro a partir de um único snapshot", async () => {
		const snapshot: MetricsSnapshot = {
			completionEvents: [
				{
					taskId: "task-1",
					createdAt: new Date("2026-07-01T00:00:00Z"),
					completedAt: new Date("2026-07-14T00:00:00Z"),
				},
				{
					taskId: "task-1",
					createdAt: new Date("2026-07-01T00:00:00Z"),
					completedAt: new Date("2026-07-16T00:00:00Z"),
				},
			],
			statusChanges: [
				{
					taskId: "task-1",
					fromStatus: "TODO",
					toStatus: "IN_DEVELOPMENT",
					changedAt: new Date("2026-07-02T00:00:00Z"),
				},
			],
			blockedPeriods: [
				{
					taskId: "task-1",
					blockedAt: new Date("2026-07-10T00:00:00Z"),
					unblockedAt: new Date("2026-07-11T00:00:00Z"),
				},
			],
			dueDateTasks: [
				{
					taskId: "task-1",
					dueDate: "2026-07-15",
					firstCompletedAt: new Date("2026-07-16T00:00:00Z"),
				},
			],
			wip: 3,
		};
		let loadSnapshotCalls = 0;
		const port: MetricsQueryPort = {
			async loadSnapshot() {
				loadSnapshotCalls += 1;
				return snapshot;
			},
		};

		const dashboard = await getMetricsDashboard(
			port,
			"team-1",
			"WEEK",
			new Date("2026-07-15T12:00:00Z"),
		);

		expect(loadSnapshotCalls).toBe(1);
		expect(dashboard.current.periodStart).toEqual(
			new Date("2026-07-13T00:00:00Z"),
		);
		expect(dashboard.current.periodEnd).toEqual(
			new Date("2026-07-20T00:00:00Z"),
		);
		expect(dashboard.current.throughput).toBe(1);
		expect(dashboard.current.wip).toBe(3);
		expect(dashboard.current.leadTime?.averageMs).toBe(15 * 86_400_000);
		expect(dashboard.current.cycleTime?.averageMs).toBe(14 * 86_400_000);
		expect(dashboard.current.blockedTime?.averageMs).toBe(86_400_000);
		expect(dashboard.current.predictability).toBe(0);
		expect(dashboard.weeklySeries).toHaveLength(8);
		expect(dashboard.monthlySeries).toHaveLength(6);
		expect(dashboard.weeklySeries.at(-1)?.metrics.throughput).toBe(1);
		expect(dashboard.weeklySeries[0].metrics.throughput).toBe(0);
		expect(dashboard.weeklySeries[0].metrics).not.toHaveProperty("wip");
	});
});
