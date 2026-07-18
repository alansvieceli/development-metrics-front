import { defineConfig } from "@playwright/test";

const TEST_DATABASE_URL =
	process.env.DATABASE_URL ??
	"postgresql://postgres:postgres@localhost:5432/development_metrics_test";
process.env.DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
	testDir: "./tests/integration",
	fullyParallel: false,
	// Todos os arquivos compartilham o mesmo banco de testes real; sem isso,
	// arquivos diferentes rodam em workers paralelos e um `resetDatabase()`
	// pode truncar o banco no meio de um teste de outro arquivo.
	workers: 1,
	globalSetup: "./tests/integration/global-setup.ts",
	webServer: {
		command: "npm run dev -- --port 3100",
		url: "http://localhost:3100",
		reuseExistingServer: !process.env.CI,
		env: {
			DATABASE_URL: TEST_DATABASE_URL,
		},
	},
	use: {
		baseURL: "http://localhost:3100",
	},
});
