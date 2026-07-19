import { describe, expect, it } from "vitest";
import { getTestDatabaseUrl } from "./test-database-url";

describe("getTestDatabaseUrl", () => {
	it("aceita banco _test", () => {
		const url =
			"postgresql://postgres:postgres@localhost:5432/development_metrics_test";
		expect(getTestDatabaseUrl(url)).toBe(url);
	});

	it.each([
		"postgresql://localhost/development_metrics",
		"postgresql://localhost/",
		"https://localhost/development_metrics_test",
		"url inválida",
	])("rejeita %s", (url) =>
		expect(() => getTestDatabaseUrl(url)).toThrow("TEST_DATABASE_URL"),
	);
});
