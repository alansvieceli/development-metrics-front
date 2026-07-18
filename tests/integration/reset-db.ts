import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";

export async function resetDatabase() {
	await db.execute(sql`TRUNCATE TABLE members, teams RESTART IDENTITY CASCADE`);
}
