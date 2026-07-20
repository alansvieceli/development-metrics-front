import { describe, expect, it } from "vitest";
import { shiftReferenceDate } from "./shift-reference-date";

describe("shiftReferenceDate", () => {
	it("avança 7 dias", () => {
		expect(
			shiftReferenceDate("WEEK", new Date("2026-07-15T12:00:00Z"), 1),
		).toEqual(new Date("2026-07-22T12:00:00Z"));
	});

	it("retrocede 7 dias", () => {
		expect(
			shiftReferenceDate("WEEK", new Date("2026-07-15T12:00:00Z"), -1),
		).toEqual(new Date("2026-07-08T12:00:00Z"));
	});

	it("avança 15 dias", () => {
		expect(
			shiftReferenceDate("FORTNIGHT", new Date("2026-07-10T12:00:00Z"), 1),
		).toEqual(new Date("2026-07-25T12:00:00Z"));
	});

	it("retrocede 15 dias", () => {
		expect(
			shiftReferenceDate("FORTNIGHT", new Date("2026-07-10T12:00:00Z"), -1),
		).toEqual(new Date("2026-06-25T12:00:00Z"));
	});

	it("avança 30 dias", () => {
		expect(
			shiftReferenceDate("MONTH", new Date("2026-07-15T12:00:00Z"), 1),
		).toEqual(new Date("2026-08-14T12:00:00Z"));
	});

	it("retrocede 30 dias virando o ano", () => {
		expect(
			shiftReferenceDate("MONTH", new Date("2026-01-15T12:00:00Z"), -1),
		).toEqual(new Date("2025-12-16T12:00:00Z"));
	});
});
