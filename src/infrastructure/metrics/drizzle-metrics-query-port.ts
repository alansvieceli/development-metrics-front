import { and, asc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import type {
	CompletedTaskMetrics,
	DueDateTaskMetrics,
	MetricsQueryPort,
} from "@/application/metrics/ports/metrics-query-port";
import type { TaskStatus } from "@/domain/task/entities/task";
import { db } from "@/infrastructure/db/client";
import {
	taskBlockedPeriods,
	taskStatusChanges,
	tasks,
} from "@/infrastructure/task/drizzle/schema";

function toDateOnly(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export const drizzleMetricsQueryPort: MetricsQueryPort = {
	async listCompletedTasksInPeriod(teamId, periodStart, periodEnd) {
		const completions = await db
			.select({
				taskId: taskStatusChanges.taskId,
				createdAt: tasks.createdAt,
				completedAt: sql<Date>`max(${taskStatusChanges.changedAt})`,
			})
			.from(taskStatusChanges)
			.innerJoin(tasks, eq(tasks.id, taskStatusChanges.taskId))
			.where(
				and(
					eq(tasks.teamId, teamId),
					eq(taskStatusChanges.toStatus, "DONE"),
					gte(taskStatusChanges.changedAt, periodStart),
					lt(taskStatusChanges.changedAt, periodEnd),
				),
			)
			.groupBy(taskStatusChanges.taskId, tasks.createdAt);

		if (completions.length === 0) {
			return [];
		}
		const taskIds = completions.map((completion) => completion.taskId);

		const statusChangeRows = await db
			.select()
			.from(taskStatusChanges)
			.where(inArray(taskStatusChanges.taskId, taskIds))
			.orderBy(asc(taskStatusChanges.changedAt));

		const blockedPeriodRows = await db
			.select()
			.from(taskBlockedPeriods)
			.where(inArray(taskBlockedPeriods.taskId, taskIds))
			.orderBy(asc(taskBlockedPeriods.blockedAt));

		return completions.map(
			(completion): CompletedTaskMetrics => ({
				taskId: completion.taskId,
				createdAt: completion.createdAt,
				completedAt: completion.completedAt,
				statusChanges: statusChangeRows
					.filter((row) => row.taskId === completion.taskId)
					.map((row) => ({
						fromStatus: row.fromStatus as TaskStatus | null,
						toStatus: row.toStatus as TaskStatus,
						changedAt: row.changedAt,
					})),
				blockedPeriods: blockedPeriodRows
					.filter((row) => row.taskId === completion.taskId)
					.map((row) => ({
						blockedAt: row.blockedAt,
						unblockedAt: row.unblockedAt,
					})),
			}),
		);
	},

	async listTasksWithDueDateInPeriod(teamId, periodStart, periodEnd) {
		const dueTasks = await db
			.select({ taskId: tasks.id, dueDate: tasks.dueDate })
			.from(tasks)
			.where(
				and(
					eq(tasks.teamId, teamId),
					isNotNull(tasks.dueDate),
					gte(tasks.dueDate, toDateOnly(periodStart)),
					lt(tasks.dueDate, toDateOnly(periodEnd)),
				),
			);

		if (dueTasks.length === 0) {
			return [];
		}
		const taskIds = dueTasks.map((task) => task.taskId);

		const completions = await db
			.select({
				taskId: taskStatusChanges.taskId,
				firstCompletedAt: sql<Date>`min(${taskStatusChanges.changedAt})`,
			})
			.from(taskStatusChanges)
			.where(
				and(
					inArray(taskStatusChanges.taskId, taskIds),
					eq(taskStatusChanges.toStatus, "DONE"),
				),
			)
			.groupBy(taskStatusChanges.taskId);
		const firstCompletedAtByTask = new Map(
			completions.map((completion) => [
				completion.taskId,
				completion.firstCompletedAt,
			]),
		);

		return dueTasks.map(
			(task): DueDateTaskMetrics => ({
				taskId: task.taskId,
				dueDate: task.dueDate as string,
				firstCompletedAt: firstCompletedAtByTask.get(task.taskId) ?? null,
			}),
		);
	},

	async countWip(teamId) {
		const [result] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(tasks)
			.where(
				and(
					eq(tasks.teamId, teamId),
					inArray(tasks.status, ["IN_DEVELOPMENT", "CODE_REVIEW"]),
				),
			);
		return result?.count ?? 0;
	},
};
