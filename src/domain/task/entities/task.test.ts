import { describe, expect, it } from "vitest";
import { isTaskStatus, TASK_STATUSES } from "./task";

describe("isTaskStatus", () => {
	it.each(TASK_STATUSES)("aceita %s", (status) => {
		expect(isTaskStatus(status)).toBe(true);
	});

	it("rejeita status desconhecido", () => {
		expect(isTaskStatus("HACKED")).toBe(false);
	});
});
