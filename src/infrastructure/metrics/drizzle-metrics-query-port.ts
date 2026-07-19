import {
	and,
	asc,
	count,
	eq,
	gte,
	inArray,
	isNotNull,
	lt,
	min,
} from "drizzle-orm";
import type {
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

export function createDrizzleMetricsQueryPort(
	database: typeof db = db,
): MetricsQueryPort {
	return {
		async loadSnapshot(teamId, periodStart, periodEnd) {
			const [completionEvents, dueDateRows, wipRows] = await Promise.all([
				database
					.select({
						taskId: taskStatusChanges.taskId,
						createdAt: tasks.createdAt,
						completedAt: taskStatusChanges.changedAt,
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
					.orderBy(asc(taskStatusChanges.changedAt)),
				database
					.select({
						taskId: tasks.id,
						dueDate: tasks.dueDate,
						firstCompletedAt: min(taskStatusChanges.changedAt),
					})
					.from(tasks)
					.leftJoin(
						taskStatusChanges,
						and(
							eq(taskStatusChanges.taskId, tasks.id),
							eq(taskStatusChanges.toStatus, "DONE"),
						),
					)
					.where(
						and(
							eq(tasks.teamId, teamId),
							isNotNull(tasks.dueDate),
							gte(tasks.dueDate, toDateOnly(periodStart)),
							lt(tasks.dueDate, toDateOnly(periodEnd)),
						),
					)
					.groupBy(tasks.id, tasks.dueDate),
				database
					.select({ count: count() })
					.from(tasks)
					.where(
						and(
							eq(tasks.teamId, teamId),
							inArray(tasks.status, ["IN_DEVELOPMENT", "CODE_REVIEW"]),
						),
					),
			]);

			const taskIds = [
				...new Set(completionEvents.map((event) => event.taskId)),
			];
			const [statusChangeRows, blockedPeriodRows] =
				taskIds.length === 0
					? [[], []]
					: await Promise.all([
							database
								.select()
								.from(taskStatusChanges)
								.where(inArray(taskStatusChanges.taskId, taskIds))
								.orderBy(asc(taskStatusChanges.changedAt)),
							database
								.select()
								.from(taskBlockedPeriods)
								.where(inArray(taskBlockedPeriods.taskId, taskIds))
								.orderBy(asc(taskBlockedPeriods.blockedAt)),
						]);

			return {
				completionEvents,
				statusChanges: statusChangeRows.map((row) => ({
					taskId: row.taskId,
					fromStatus: row.fromStatus as TaskStatus | null,
					toStatus: row.toStatus as TaskStatus,
					changedAt: row.changedAt,
				})),
				blockedPeriods: blockedPeriodRows.map((row) => ({
					taskId: row.taskId,
					blockedAt: row.blockedAt,
					unblockedAt: row.unblockedAt,
				})),
				dueDateTasks: dueDateRows.map(
					(row): DueDateTaskMetrics => ({
						taskId: row.taskId,
						dueDate: row.dueDate as string,
						firstCompletedAt: row.firstCompletedAt,
					}),
				),
				wip: wipRows[0]?.count ?? 0,
			};
		},
	};
}

export const drizzleMetricsQueryPort = createDrizzleMetricsQueryPort();
