import { migrateDatabase } from "../../scripts/migrate-database";

export default async function globalSetup() {
	await migrateDatabase(process.env.DATABASE_URL as string);
}
