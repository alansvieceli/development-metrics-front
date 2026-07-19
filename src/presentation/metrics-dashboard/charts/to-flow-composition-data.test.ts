import { describe, expect, it } from "vitest";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { toFlowCompositionData } from "./to-flow-composition-data";

function periodMetrics(overrides: Partial<PeriodMetrics>): PeriodMetrics {
	return {
		periodStart: new Date("2026-07-13T00:00:00Z"),
		periodEnd: new Date("2026-07-20T00:00:00Z"),
		leadTime: null,
		cycleTime: null,
		blockedTime: null,
		codeReviewTime: null,
		testingTime: null,
		awaitingPublicationTime: null,
		reworkRate: null,
		reworkCount: null,
		throughput: 0,
		wip: {
			total: 0,
			limit: 6,
			blocked: 0,
			oldestBlockedAgeMs: null,
			inReview: 0,
			averageReviewAgeMs: null,
			inTesting: 0,
			oldestTestingAgeMs: null,
			inPublication: 0,
			oldestPublicationAgeMs: null,
		},
		predictability: null,
		predictabilityCounts: null,
		unplannedCount: null,
		bugsOpened: 0,
		bugsRanking: [],
		...overrides,
	};
}

describe("toFlowCompositionData", () => {
	it("retorna null quando não há cycle time no período", () => {
		expect(toFlowCompositionData(periodMetrics({}))).toBeNull();
	});

	it("calcula desenvolvimento como o restante do cycle time", () => {
		const current = periodMetrics({
			cycleTime: { averageMs: 1000, medianMs: 1000 },
			codeReviewTime: { averageMs: 200, medianMs: 200 },
			testingTime: { averageMs: 100, medianMs: 100 },
			blockedTime: { averageMs: 50, medianMs: 50 },
			awaitingPublicationTime: { averageMs: 150, medianMs: 150 },
		});

		expect(toFlowCompositionData(current)).toEqual({
			development: 500,
			codeReview: 200,
			testing: 100,
			blocked: 50,
			awaitingPublication: 150,
		});
	});

	it("tem piso em 0 quando as etapas somam mais que o cycle time", () => {
		const current = periodMetrics({
			cycleTime: { averageMs: 100, medianMs: 100 },
			codeReviewTime: { averageMs: 200, medianMs: 200 },
		});

		expect(toFlowCompositionData(current)?.development).toBe(0);
	});

	it("trata etapas sem dado como 0", () => {
		const current = periodMetrics({
			cycleTime: { averageMs: 1000, medianMs: 1000 },
		});

		expect(toFlowCompositionData(current)).toEqual({
			development: 1000,
			codeReview: 0,
			testing: 0,
			blocked: 0,
			awaitingPublication: 0,
		});
	});
});
