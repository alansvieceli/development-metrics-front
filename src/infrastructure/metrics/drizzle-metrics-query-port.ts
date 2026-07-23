import {
	and,
	asc,
	eq,
	exists,
	gte,
	inArray,
	isNotNull,
	isNull,
	lt,
	min,
	notInArray,
	sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type {
	BugEvent,
	DueDateTaskMetrics,
	MetricsQueryPort,
} from "@/application/metrics/ports/metrics-query-port";
import type { TaskStatus } from "@/domain/task/entities/task";
import { db } from "@/infrastructure/db/client";
import {
	taskBlockedPeriods,
	taskStatusChanges,
	taskTags,
	tasks,
	taskTypes,
} from "@/infrastructure/task/drizzle/schema";

const parentTasks = alias(tasks, "parent_tasks");

function toDateOnly(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function createDrizzleMetricsQueryPort(
	database: typeof db = db,
): MetricsQueryPort {
	return {
		async loadSnapshot(teamId, periodStart, periodEnd, assigneeId, tagIds) {
			const taskAssigneeCondition = assigneeId
				? eq(tasks.assigneeId, assigneeId)
				: undefined;
			const parentAssigneeCondition = assigneeId
				? eq(parentTasks.assigneeId, assigneeId)
				: undefined;
			const tagCondition =
				tagIds && tagIds.length > 0
					? exists(
							database
								.select({ one: sql`1` })
								.from(taskTags)
								.where(
									and(
										eq(taskTags.taskId, tasks.id),
										inArray(taskTags.tagId, tagIds),
									),
								),
						)
					: undefined;
			const [completionEvents, dueDateRows, currentWipRows, bugRows] =
				await Promise.all([
					database
						.select({
							taskId: taskStatusChanges.taskId,
							externalId: tasks.externalId,
							description: tasks.description,
							createdAt: tasks.createdAt,
							completedAt: taskStatusChanges.changedAt,
							dueDate: tasks.dueDate,
						})
						.from(taskStatusChanges)
						.innerJoin(tasks, eq(tasks.id, taskStatusChanges.taskId))
						.where(
							and(
								eq(tasks.teamId, teamId),
								taskAssigneeCondition,
								tagCondition,
								eq(taskStatusChanges.toStatus, "DONE"),
								gte(taskStatusChanges.changedAt, periodStart),
								lt(taskStatusChanges.changedAt, periodEnd),
							),
						)
						.orderBy(asc(taskStatusChanges.changedAt)),
					database
						.select({
							taskId: tasks.id,
							externalId: tasks.externalId,
							description: tasks.description,
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
								taskAssigneeCondition,
								tagCondition,
								isNotNull(tasks.dueDate),
								gte(tasks.dueDate, toDateOnly(periodStart)),
								lt(tasks.dueDate, toDateOnly(periodEnd)),
							),
						)
						.groupBy(
							tasks.id,
							tasks.externalId,
							tasks.description,
							tasks.dueDate,
						),
					database
						.select({
							status: tasks.status,
							statusChangedAt:
								sql<Date>`coalesce(max(${taskStatusChanges.changedAt}), ${tasks.createdAt})`.mapWith(
									tasks.createdAt,
								),
							blockedAt:
								sql<Date | null>`case when ${tasks.blocked} then max(${taskBlockedPeriods.blockedAt}) else null end`.mapWith(
									taskBlockedPeriods.blockedAt,
								),
						})
						.from(tasks)
						.leftJoin(
							taskStatusChanges,
							and(
								eq(taskStatusChanges.taskId, tasks.id),
								eq(taskStatusChanges.toStatus, tasks.status),
							),
						)
						.leftJoin(
							taskBlockedPeriods,
							and(
								eq(taskBlockedPeriods.taskId, tasks.id),
								isNull(taskBlockedPeriods.unblockedAt),
							),
						)
						.where(
							and(
								eq(tasks.teamId, teamId),
								taskAssigneeCondition,
								tagCondition,
								notInArray(tasks.status, ["TODO", "DONE"]),
							),
						)
						.groupBy(tasks.id),
					database
						.select({
							taskId: tasks.id,
							createdAt: tasks.createdAt,
							parentTaskId: tasks.parentTaskId,
							parentExternalId: parentTasks.externalId,
							parentDescription: parentTasks.description,
						})
						.from(tasks)
						.innerJoin(taskTypes, eq(taskTypes.id, tasks.typeId))
						.leftJoin(parentTasks, eq(parentTasks.id, tasks.parentTaskId))
						.where(
							and(
								eq(tasks.teamId, teamId),
								parentAssigneeCondition,
								tagCondition,
								eq(taskTypes.isBug, true),
								gte(tasks.createdAt, periodStart),
								lt(tasks.createdAt, periodEnd),
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
						externalId: row.externalId,
						description: row.description,
						dueDate: row.dueDate as string,
						firstCompletedAt: row.firstCompletedAt,
					}),
				),
				currentWipTasks: currentWipRows.map((row) => ({
					status: row.status as TaskStatus,
					statusChangedAt: row.statusChangedAt,
					blockedAt: row.blockedAt,
				})),
				bugEvents: bugRows.map(
					(row): BugEvent => ({
						taskId: row.taskId,
						createdAt: row.createdAt,
						parentTaskId: row.parentTaskId ?? null,
						parentExternalId: row.parentExternalId ?? null,
						parentDescription: row.parentDescription ?? null,
					}),
				),
			};
		},
	};
}

export const drizzleMetricsQueryPort = createDrizzleMetricsQueryPort();
