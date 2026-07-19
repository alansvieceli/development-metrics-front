import { describe, expect, it } from "vitest";
import type { BugEvent } from "@/application/metrics/ports/metrics-query-port";
import { calculateBugsOpened, calculateBugsRanking } from "./bug-metrics";

function bugEvent(overrides: Partial<BugEvent> = {}): BugEvent {
	return {
		taskId: "bug-1",
		createdAt: new Date("2026-07-14T00:00:00Z"),
		parentTaskId: "parent-1",
		parentExternalId: "TASK-PAI",
		parentDescription: "Task de origem",
		...overrides,
	};
}

const periodStart = new Date("2026-07-13T00:00:00Z");
const periodEnd = new Date("2026-07-20T00:00:00Z");

describe("calculateBugsOpened", () => {
	it("conta bugs do período com ou sem vínculo de origem", () => {
		const events = [
			bugEvent({ taskId: "bug-1" }),
			bugEvent({
				taskId: "bug-2",
				parentTaskId: null,
				parentExternalId: null,
			}),
		];
		expect(calculateBugsOpened(events, periodStart, periodEnd)).toBe(2);
	});

	it("ignora bugs fora do período", () => {
		const events = [bugEvent({ createdAt: new Date("2026-07-01T00:00:00Z") })];
		expect(calculateBugsOpened(events, periodStart, periodEnd)).toBe(0);
	});

	it("retorna 0 quando não há bugs", () => {
		expect(calculateBugsOpened([], periodStart, periodEnd)).toBe(0);
	});
});

describe("calculateBugsRanking", () => {
	it("agrupa por task de origem e ordena decrescente", () => {
		const events = [
			bugEvent({
				taskId: "bug-1",
				parentTaskId: "parent-1",
				parentExternalId: "TASK-A",
			}),
			bugEvent({
				taskId: "bug-2",
				parentTaskId: "parent-2",
				parentExternalId: "TASK-B",
			}),
			bugEvent({
				taskId: "bug-3",
				parentTaskId: "parent-1",
				parentExternalId: "TASK-A",
			}),
		];
		expect(calculateBugsRanking(events, periodStart, periodEnd)).toEqual([
			{ taskId: "parent-1", externalId: "TASK-A", bugCount: 2 },
			{ taskId: "parent-2", externalId: "TASK-B", bugCount: 1 },
		]);
	});

	it("exclui bugs sem task de origem", () => {
		const events = [bugEvent({ parentTaskId: null, parentExternalId: null })];
		expect(calculateBugsRanking(events, periodStart, periodEnd)).toEqual([]);
	});

	it("corta no top 5", () => {
		const events = Array.from({ length: 6 }, (_, i) =>
			bugEvent({
				taskId: `bug-${i}`,
				parentTaskId: `parent-${i}`,
				parentExternalId: `TASK-${i}`,
			}),
		);
		expect(calculateBugsRanking(events, periodStart, periodEnd)).toHaveLength(
			5,
		);
	});

	it("ignora bugs fora do período", () => {
		const events = [bugEvent({ createdAt: new Date("2026-06-01T00:00:00Z") })];
		expect(calculateBugsRanking(events, periodStart, periodEnd)).toEqual([]);
	});

	it("retorna vazio quando não há bugs", () => {
		expect(calculateBugsRanking([], periodStart, periodEnd)).toEqual([]);
	});
});
