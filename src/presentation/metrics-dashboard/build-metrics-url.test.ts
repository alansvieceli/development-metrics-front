import { describe, expect, it } from "vitest";
import { buildMetricsUrl } from "./build-metrics-url";

describe("buildMetricsUrl", () => {
	it("preserva o desenvolvedor ao trocar o período", () => {
		const url = buildMetricsUrl(
			"/metrics/developers",
			new URLSearchParams("developer=member-1&period=week&date=2026-07-19"),
			{ period: "month", date: "2026-07-19" },
		);
		expect(url).toBe(
			"/metrics/developers?developer=member-1&period=month&date=2026-07-19",
		);
	});

	it("troca filtros regulares por um intervalo personalizado", () => {
		const url = buildMetricsUrl(
			"/metrics/developers",
			new URLSearchParams("developer=member-1&period=month&date=2026-07-19"),
			{ period: "custom", start: "2026-07-01", end: "2026-07-15" },
		);
		expect(url).toBe(
			"/metrics/developers?developer=member-1&period=custom&start=2026-07-01&end=2026-07-15",
		);
	});
});
