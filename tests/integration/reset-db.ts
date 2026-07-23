import { getTestDatabaseUrl } from "../../scripts/test-database-url";

export async function resetDatabase() {
	getTestDatabaseUrl();
	const [{ sql }, { db }, { seedDefaultTaskTypes }] = await Promise.all([
		import("drizzle-orm"),
		import("../../src/infrastructure/db/client"),
		import("../../src/infrastructure/task/drizzle/seed-task-types"),
	]);
	await db.execute(
		sql`TRUNCATE TABLE task_blocked_periods, task_status_changes, tasks, task_types, tags, members, teams RESTART IDENTITY CASCADE`,
	);
	await seedDefaultTaskTypes();
}
