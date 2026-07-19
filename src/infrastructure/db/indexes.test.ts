import { sql } from "drizzle-orm";
import { expect, it } from "vitest";
import { db } from "./client";

it("mantém índices para os filtros operacionais", async () => {
	const rows = await db.execute<{ indexname: string }>(sql`
		select indexname
		from pg_indexes
		where schemaname = 'public'
	`);
	const names = rows.map((row) => row.indexname);

	expect(names).toEqual(
		expect.arrayContaining([
			"members_team_id_idx",
			"tasks_type_id_idx",
			"tasks_assignee_id_idx",
		]),
	);
});
