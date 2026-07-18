import { defineConfig } from "drizzle-kit";

try {
	process.loadEnvFile();
} catch {
	// .env é opcional; variáveis também podem vir do ambiente (CI, docker etc.)
}

export default defineConfig({
	schema: "./src/infrastructure/**/drizzle/schema.ts",
	out: "./drizzle/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL as string,
	},
});
