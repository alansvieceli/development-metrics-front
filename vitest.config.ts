import path from "node:path";
import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
	process.env.DATABASE_URL ??
	"postgresql://postgres:postgres@localhost:5432/development_metrics_test";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		env: {
			DATABASE_URL: TEST_DATABASE_URL,
		},
		globalSetup: "./vitest.global-setup.ts",
		fileParallelism: false,
	},
});
