import { describe, expect, it } from "vitest";
import { calculateCurrentWipMetrics } from "./current-wip-metrics";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = new Date("2026-07-19T12:00:00Z");

describe("calculateCurrentWipMetrics", () => {
	it("calcula contagens, limite e permanência atual no fluxo", () => {
		const metrics = calculateCurrentWipMetrics(
			[
				{
					status: "IN_DEVELOPMENT",
					blockedAt: new Date(NOW.getTime() - 3 * DAY),
					statusChangedAt: new Date(NOW.getTime() - DAY),
				},
				{
					status: "CODE_REVIEW",
					blockedAt: null,
					statusChangedAt: new Date(NOW.getTime() - 4 * HOUR),
				},
				{
					status: "CODE_REVIEW",
					blockedAt: null,
					statusChangedAt: new Date(NOW.getTime() - 8 * HOUR),
				},
				{
					status: "TESTING",
					blockedAt: null,
					statusChangedAt: new Date(NOW.getTime() - 2 * HOUR),
				},
				{
					status: "AWAITING_PUBLICATION",
					blockedAt: null,
					statusChangedAt: new Date(NOW.getTime() - DAY),
				},
				{
					status: "IN_DEVELOPMENT",
					blockedAt: null,
					statusChangedAt: NOW,
				},
				{
					status: "IN_DEVELOPMENT",
					blockedAt: null,
					statusChangedAt: NOW,
				},
			],
			8,
			NOW,
		);

		expect(metrics).toEqual({
			total: 7,
			limit: 8,
			blocked: 1,
			oldestBlockedAgeMs: 3 * DAY,
			inReview: 2,
			averageReviewAgeMs: 6 * HOUR,
			inTesting: 1,
			oldestTestingAgeMs: 2 * HOUR,
			inPublication: 1,
			oldestPublicationAgeMs: DAY,
		});
	});

	it("retorna tempos nulos quando não há cards no estágio", () => {
		expect(calculateCurrentWipMetrics([], 6, NOW)).toEqual({
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
		});
	});
});
