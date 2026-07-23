import { eq } from "drizzle-orm";
import type {
	CreateSprintTaskSnapshotData,
	SprintTaskSnapshotRepository,
} from "@/application/sprint/ports/sprint-task-snapshot-repository";
import type { SprintTaskSnapshot } from "@/domain/sprint/entities/sprint-task-snapshot";
import type { TaskStatus } from "@/domain/task/entities/task";
import { db } from "@/infrastructure/db/client";
import { sprintTaskSnapshots } from "./drizzle/schema";

function toSnapshot(
	row: typeof sprintTaskSnapshots.$inferSelect,
): SprintTaskSnapshot {
	return { ...row, statusAtFreeze: row.statusAtFreeze as TaskStatus };
}

export const drizzleSprintTaskSnapshotRepository: SprintTaskSnapshotRepository =
	{
		async createMany(data: CreateSprintTaskSnapshotData[]) {
			if (data.length === 0) return;
			await db.insert(sprintTaskSnapshots).values(data);
		},
		async listBySprint(sprintId) {
			const rows = await db
				.select()
				.from(sprintTaskSnapshots)
				.where(eq(sprintTaskSnapshots.sprintId, sprintId));
			return rows.map(toSnapshot);
		},
	};
