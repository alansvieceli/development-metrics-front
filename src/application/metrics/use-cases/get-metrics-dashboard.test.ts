import { afterEach, describe, expect, it, vi } from "vitest";
import type {
	MetricsQueryPort,
	MetricsSnapshot,
} from "@/application/metrics/ports/metrics-query-port";
import {
	getMetricsDashboard,
	getMetricsDashboardForRange,
} from "./get-metrics-dashboard";

describe("getMetricsDashboard", () => {
	afterEach(() => vi.useRealTimers());

	it("calcula o dashboard inteiro a partir de um único snapshot largo", async () => {
		vi.setSystemTime(new Date("2026-07-19T12:00:00Z"));
		const snapshot: MetricsSnapshot = {
			completionEvents: [
				{
					taskId: "task-1",
					externalId: "TASK-1",
					description: "Task de teste",
					createdAt: new Date("2026-07-01T00:00:00Z"),
					completedAt: new Date("2026-07-14T00:00:00Z"),
					dueDate: "2026-07-15",
				},
				{
					taskId: "task-1",
					externalId: "TASK-1",
					description: "Task de teste",
					createdAt: new Date("2026-07-01T00:00:00Z"),
					completedAt: new Date("2026-07-16T00:00:00Z"),
					dueDate: "2026-07-15",
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
					externalId: "TASK-1",
					description: "Task de teste",
					dueDate: "2026-07-15",
					firstCompletedAt: new Date("2026-07-16T00:00:00Z"),
				},
			],
			currentWipTasks: [
				{
					status: "CODE_REVIEW",
					statusChangedAt: new Date("2026-07-19T06:00:00Z"),
					blockedAt: null,
				},
			],
			bugEvents: [],
		};
		let loadSnapshotCalls = 0;
		let capturedRange: { start: Date; end: Date } | null = null;
		const port: MetricsQueryPort = {
			async loadSnapshot(_teamId, periodStart, periodEnd) {
				loadSnapshotCalls += 1;
				capturedRange = { start: periodStart, end: periodEnd };
				return snapshot;
			},
		};

		const dashboard = await getMetricsDashboard(
			port,
			"team-1",
			"WEEK",
			new Date("2026-07-15T12:00:00Z"),
			8,
		);

		expect(loadSnapshotCalls).toBe(1);
		expect(capturedRange).toEqual({
			start: new Date("2026-05-21T00:00:00Z"),
			end: new Date("2026-07-16T00:00:00Z"),
		});
		expect(dashboard.history).toHaveLength(8);
		expect(dashboard.history.at(-1)?.periodStart).toEqual(
			new Date("2026-07-09T00:00:00Z"),
		);
		expect(dashboard.history.at(-1)?.throughput).toBe(1);
		expect(dashboard.history[0]?.periodStart).toEqual(
			new Date("2026-05-21T00:00:00Z"),
		);
		expect(dashboard.history[0]?.throughput).toBe(0);
		expect(dashboard.current.periodStart).toEqual(
			new Date("2026-07-09T00:00:00Z"),
		);
		expect(dashboard.current.periodEnd).toEqual(
			new Date("2026-07-16T00:00:00Z"),
		);
		expect(dashboard.current.throughput).toBe(1);
		expect(dashboard.current.wip).toEqual({
			total: 1,
			limit: 8,
			blocked: 0,
			oldestBlockedAgeMs: null,
			inReview: 1,
			averageReviewAgeMs: 6 * 3_600_000,
			inTesting: 0,
			oldestTestingAgeMs: null,
			inPublication: 0,
			oldestPublicationAgeMs: null,
		});
		expect(dashboard.current.leadTime?.averageMs).toBe(13 * 86_400_000);
		expect(dashboard.current.cycleTime?.averageMs).toBe(12 * 86_400_000);
		expect(dashboard.current.blockedTime?.averageMs).toBe(86_400_000);
		expect(dashboard.current.predictability).toBe(0);
	});

	it("calcula o dashboard de um range arbitrário sem histórico", async () => {
		vi.setSystemTime(new Date("2026-07-19T12:00:00Z"));
		const snapshot: MetricsSnapshot = {
			completionEvents: [
				{
					taskId: "task-1",
					externalId: "TASK-1",
					description: "Task de teste",
					createdAt: new Date("2026-07-01T00:00:00Z"),
					completedAt: new Date("2026-07-10T00:00:00Z"),
					dueDate: "2026-07-15",
				},
			],
			statusChanges: [],
			blockedPeriods: [],
			dueDateTasks: [],
			currentWipTasks: [],
			bugEvents: [],
		};
		let capturedRange: { start: Date; end: Date } | null = null;
		const port: MetricsQueryPort = {
			async loadSnapshot(_teamId, periodStart, periodEnd) {
				capturedRange = { start: periodStart, end: periodEnd };
				return snapshot;
			},
		};

		const start = new Date("2026-07-06T00:00:00Z");
		const end = new Date("2026-07-18T00:00:00Z");
		const dashboard = await getMetricsDashboardForRange(
			port,
			"team-1",
			start,
			end,
			8,
		);

		expect(capturedRange).toEqual({ start, end });
		expect(dashboard.history).toEqual([]);
		expect(dashboard.current.periodStart).toEqual(start);
		expect(dashboard.current.periodEnd).toEqual(end);
		expect(dashboard.current.throughput).toBe(1);
	});

	it("repassa tagIds pro port de consulta", async () => {
		vi.setSystemTime(new Date("2026-07-19T12:00:00Z"));
		const emptySnapshot: MetricsSnapshot = {
			completionEvents: [],
			statusChanges: [],
			blockedPeriods: [],
			dueDateTasks: [],
			currentWipTasks: [],
			bugEvents: [],
		};
		let capturedTagIds: string[] | undefined;
		const port: MetricsQueryPort = {
			async loadSnapshot(_teamId, _start, _end, _assigneeId, tagIds) {
				capturedTagIds = tagIds;
				return emptySnapshot;
			},
		};

		await getMetricsDashboard(
			port,
			"team-1",
			"WEEK",
			new Date("2026-07-15T12:00:00Z"),
			8,
			["tag-1", "tag-2"],
		);
		expect(capturedTagIds).toEqual(["tag-1", "tag-2"]);

		await getMetricsDashboardForRange(
			port,
			"team-1",
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-07-08T00:00:00Z"),
			8,
			["tag-3"],
		);
		expect(capturedTagIds).toEqual(["tag-3"]);
	});
});
