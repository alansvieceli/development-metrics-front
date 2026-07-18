import { migrateDatabase } from "./scripts/migrate-database";

export default async function setup() {
	await migrateDatabase(
		process.env.DATABASE_URL ??
			"postgresql://postgres:postgres@localhost:5432/development_metrics_test",
	);
}
