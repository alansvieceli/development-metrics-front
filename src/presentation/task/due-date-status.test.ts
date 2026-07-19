import { describe, expect, it } from "vitest";
import { getDueDateStatus } from "./due-date-status";

const today = new Date("2026-07-19T12:00:00Z");

describe("getDueDateStatus", () => {
	it("retorna ok quando o prazo é distante (mais de 2 dias)", () => {
		expect(getDueDateStatus("2026-07-25", "TODO", today)).toBe("ok");
	});

	it("retorna warning quando faltam exatamente 2 dias", () => {
		expect(getDueDateStatus("2026-07-21", "TODO", today)).toBe("warning");
	});

	it("retorna warning quando o prazo é hoje", () => {
		expect(getDueDateStatus("2026-07-19", "TODO", today)).toBe("warning");
	});

	it("retorna overdue quando o prazo já passou", () => {
		expect(getDueDateStatus("2026-07-18", "TODO", today)).toBe("overdue");
	});

	it("retorna none quando o prazo passou mas a task está concluída", () => {
		expect(getDueDateStatus("2026-07-18", "DONE", today)).toBe("none");
	});
});
