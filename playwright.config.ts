import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/integration",
	fullyParallel: false,
	webServer: {
		command: "npm run dev -- --port 3100",
		url: "http://localhost:3100",
		reuseExistingServer: !process.env.CI,
	},
	use: {
		baseURL: "http://localhost:3100",
	},
});
