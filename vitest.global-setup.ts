import { migrateDatabase } from "./scripts/migrate-database";
import { getTestDatabaseUrl } from "./scripts/test-database-url";

export default async function setup() {
	await migrateDatabase(getTestDatabaseUrl());
}
