import { describe, expect, it } from "vitest";
import {
	getMetricsForPeriod,
	getMetricsForRange,
} from "./get-metrics-for-period";
import { createFakeMetricsQueryPort } from "./test-helpers/create-fake-metrics-query-port";

describe("getMetricsForRange", () => {
	it("monta as 8 métricas a partir dos dados retornados pelo port", async () => {
		const port = createFakeMetricsQueryPort();
		port.completedTasks = [
			{
				taskId: "task-1",
				createdAt: new Date("2026-07-01T00:00:00Z"),
				completedAt: new Date("2026-07-03T00:00:00Z"),
				statusChanges: [
					{
						fromStatus: "TODO",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T00:00:00Z"),
					},
				],
				blockedPeriods: [],
			},
		];
		port.dueDateTasks = [
			{
				taskId: "task-1",
				dueDate: "2026-07-03",
				firstCompletedAt: new Date("2026-07-03T00:00:00Z"),
			},
		];
		port.wip = 4;

		const start = new Date("2026-07-01T00:00:00Z");
		const end = new Date("2026-07-08T00:00:00Z");
		const metrics = await getMetricsForRange(port, "team-1", start, end);

		expect(metrics.periodStart).toEqual(start);
		expect(metrics.periodEnd).toEqual(end);
		expect(metrics.leadTime?.averageMs).toBe(2 * 24 * 60 * 60 * 1000);
		expect(metrics.cycleTime?.averageMs).toBe(2 * 24 * 60 * 60 * 1000);
		expect(metrics.blockedTime).toEqual({ averageMs: 0, medianMs: 0 });
		expect(metrics.codeReviewTime).toEqual({ averageMs: 0, medianMs: 0 });
		expect(metrics.reworkRate).toBe(0);
		expect(metrics.throughput).toBe(1);
		expect(metrics.wip).toBe(4);
		expect(metrics.predictability).toBe(100);
	});

	it("retorna vazio/zero quando não há tasks concluídas ou com dueDate no período", async () => {
		const port = createFakeMetricsQueryPort();

		const metrics = await getMetricsForRange(
			port,
			"team-1",
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-07-08T00:00:00Z"),
		);

		expect(metrics.leadTime).toBeNull();
		expect(metrics.cycleTime).toBeNull();
		expect(metrics.blockedTime).toBeNull();
		expect(metrics.codeReviewTime).toBeNull();
		expect(metrics.reworkRate).toBeNull();
		expect(metrics.throughput).toBe(0);
		expect(metrics.wip).toBe(0);
		expect(metrics.predictability).toBeNull();
	});
});

describe("getMetricsForPeriod", () => {
	it("resolve o período a partir do tipo e da data de referência antes de consultar o port", async () => {
		const port = createFakeMetricsQueryPort();
		const metrics = await getMetricsForPeriod(
			port,
			"team-1",
			"WEEK",
			new Date("2026-07-15T12:00:00Z"),
		);
		expect(metrics.periodStart).toEqual(new Date("2026-07-13T00:00:00Z"));
		expect(metrics.periodEnd).toEqual(new Date("2026-07-20T00:00:00Z"));
	});
});
