import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export async function migrateDatabase(connectionString: string) {
	const client = postgres(connectionString, { max: 1 });
	const db = drizzle(client);
	await migrate(db, { migrationsFolder: "./drizzle/migrations" });
	await client.end();
}
