import { asc, inArray } from "drizzle-orm";
import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import { db } from "@/infrastructure/db/client";
import { taskStatusChanges } from "./drizzle/schema";

export const drizzleTaskHistoryRepository: TaskHistoryRepository = {
	async getStatusChangedAtForTasks(taskIds) {
		if (taskIds.length === 0) {
			return {};
		}
		const rows = await db
			.select({
				taskId: taskStatusChanges.taskId,
				changedAt: taskStatusChanges.changedAt,
			})
			.from(taskStatusChanges)
			.where(inArray(taskStatusChanges.taskId, taskIds))
			.orderBy(asc(taskStatusChanges.changedAt));
		const result: Record<string, Date> = {};
		for (const row of rows) {
			result[row.taskId] = row.changedAt;
		}
		return result;
	},
};
