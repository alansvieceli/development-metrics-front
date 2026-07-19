import { describe, expect, it } from "vitest";
import { isUuid, parseDateOnly } from "./validation";

describe("isUuid", () => {
	it("aceita UUID canônico", () => {
		expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
	});

	it.each([null, undefined, "abc", "550e8400e29b41d4a716446655440000"])(
		"rejeita %s",
		(value) => expect(isUuid(value)).toBe(false),
	);
});

describe("parseDateOnly", () => {
	it.each([
		["2026-02-28", true],
		["2026-02-29", false],
		["2028-02-29", true],
		["2026-02-31", false],
		["2026-13-01", false],
	])("valida %s", (value, valid) => {
		expect(Boolean(parseDateOnly(value))).toBe(valid);
	});
});
