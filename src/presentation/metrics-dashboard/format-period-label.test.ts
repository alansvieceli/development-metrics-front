import { describe, expect, it } from "vitest";
import {
	formatPeriodRangeLabel,
	formatPeriodShortLabel,
} from "./format-period-label";

describe("formatPeriodRangeLabel", () => {
	it("formata o intervalo de datas do período", () => {
		expect(
			formatPeriodRangeLabel(
				new Date("2026-07-13T00:00:00Z"),
				new Date("2026-07-20T00:00:00Z"),
			),
		).toBe("13/07 – 19/07");
	});

	it("formata intervalos de meses diferentes", () => {
		expect(
			formatPeriodRangeLabel(
				new Date("2026-06-16T00:00:00Z"),
				new Date("2026-07-16T00:00:00Z"),
			),
		).toBe("16/06 – 15/07");
	});
});

describe("formatPeriodShortLabel", () => {
	it("formata como dia/mês do início do período, independente do tipo", () => {
		expect(
			formatPeriodShortLabel("WEEK", new Date("2026-07-13T00:00:00Z")),
		).toBe("13/07");
		expect(
			formatPeriodShortLabel("MONTH", new Date("2026-06-16T00:00:00Z")),
		).toBe("16/06");
		expect(
			formatPeriodShortLabel("FORTNIGHT", new Date("2026-07-16T00:00:00Z")),
		).toBe("16/07");
	});
});
