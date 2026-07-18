import { describe, expect, it } from "vitest";
import { shiftReferenceDate } from "./shift-reference-date";

describe("shiftReferenceDate", () => {
	it("avança uma semana", () => {
		expect(
			shiftReferenceDate("WEEK", new Date("2026-07-15T12:00:00Z"), 1),
		).toEqual(new Date("2026-07-22T12:00:00Z"));
	});

	it("retrocede uma semana", () => {
		expect(
			shiftReferenceDate("WEEK", new Date("2026-07-15T12:00:00Z"), -1),
		).toEqual(new Date("2026-07-08T12:00:00Z"));
	});

	it("avança um mês de calendário", () => {
		expect(
			shiftReferenceDate("MONTH", new Date("2026-07-15T12:00:00Z"), 1),
		).toEqual(new Date("2026-08-15T12:00:00Z"));
	});

	it("retrocede um mês de calendário virando o ano", () => {
		expect(
			shiftReferenceDate("MONTH", new Date("2026-01-15T12:00:00Z"), -1),
		).toEqual(new Date("2025-12-15T12:00:00Z"));
	});
});
