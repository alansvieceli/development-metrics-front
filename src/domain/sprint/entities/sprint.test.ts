import { describe, expect, it } from "vitest";
import { isSprintStatus, SPRINT_STATUSES } from "./sprint";

describe("isSprintStatus", () => {
	it.each(SPRINT_STATUSES)("aceita %s", (status) => {
		expect(isSprintStatus(status)).toBe(true);
	});

	it("rejeita status desconhecido", () => {
		expect(isSprintStatus("HACKED")).toBe(false);
	});
});
