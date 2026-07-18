import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { seedDefaultTaskTypes } from "@/infrastructure/task/drizzle/seed-task-types";

export async function resetDatabase() {
	await db.execute(
		sql`TRUNCATE TABLE task_blocked_periods, task_status_changes, tasks, task_types, members, teams RESTART IDENTITY CASCADE`,
	);
	await seedDefaultTaskTypes();
}
