import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import { db } from "@/infrastructure/db/client";
import { taskBlockedPeriods, taskStatusChanges } from "./drizzle/schema";

export const drizzleTaskHistoryRepository: TaskHistoryRepository = {
	async recordStatusChange(taskId, fromStatus, toStatus) {
		await db.insert(taskStatusChanges).values({ taskId, fromStatus, toStatus });
	},
	async openBlockedPeriod(taskId) {
		await db.insert(taskBlockedPeriods).values({ taskId });
	},
	async closeBlockedPeriod(taskId) {
		const [open] = await db
			.select()
			.from(taskBlockedPeriods)
			.where(
				and(
					eq(taskBlockedPeriods.taskId, taskId),
					isNull(taskBlockedPeriods.unblockedAt),
				),
			)
			.orderBy(desc(taskBlockedPeriods.blockedAt))
			.limit(1);
		if (!open) {
			throw new Error("Não há período de bloqueio aberto para esta task");
		}
		await db
			.update(taskBlockedPeriods)
			.set({ unblockedAt: new Date() })
			.where(eq(taskBlockedPeriods.id, open.id));
	},
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
