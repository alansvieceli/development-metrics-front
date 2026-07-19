import path from "node:path";
import { defineConfig } from "vitest/config";
import { getTestDatabaseUrl } from "./scripts/test-database-url";

const TEST_DATABASE_URL = getTestDatabaseUrl();

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
		env: {
			DATABASE_URL: TEST_DATABASE_URL,
		},
		globalSetup: "./vitest.global-setup.ts",
		fileParallelism: false,
	},
});
