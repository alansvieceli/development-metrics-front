import {
	and,
	desc,
	eq,
	getTableColumns,
	inArray,
	isNull,
	max,
	ne,
	sql,
} from "drizzle-orm";
import { ApplicationError } from "@/application/shared/application-error";
import type {
	CreateTaskData,
	TaskRepository,
	UpdateTaskData,
} from "@/application/task/ports/task-repository";
import type { Task, TaskStatus } from "@/domain/task/entities/task";
import { db } from "@/infrastructure/db/client";
import {
	taskBlockedPeriods,
	taskStatusChanges,
	tasks,
	taskTags,
} from "./drizzle/schema";

function toTask(row: typeof tasks.$inferSelect): Task {
	return { ...row, status: row.status as TaskStatus };
}

export const drizzleTaskRepository: TaskRepository = {
	async createWithInitialHistory(data: CreateTaskData) {
		return db.transaction(async (tx) => {
			const { tagIds, ...taskData } = data;
			const [row] = await tx.insert(tasks).values(taskData).returning();
			await tx.insert(taskStatusChanges).values({
				taskId: row.id,
				fromStatus: null,
				toStatus: data.status,
			});
			if (tagIds && tagIds.length > 0) {
				await tx
					.insert(taskTags)
					.values(tagIds.map((tagId) => ({ taskId: row.id, tagId })));
			}
			return toTask(row);
		});
	},
	async createWithExplicitHistory(data, history) {
		return db.transaction(async (tx) => {
			const { tagIds, ...taskData } = data;
			const [row] = await tx
				.insert(tasks)
				.values({
					...taskData,
					status: history[0].status,
					createdAt: history[0].changedAt,
				})
				.returning();
			let fromStatus: TaskStatus | null = null;
			for (const step of history) {
				await tx.insert(taskStatusChanges).values({
					taskId: row.id,
					fromStatus,
					toStatus: step.status,
					changedAt: step.changedAt,
				});
				fromStatus = step.status;
			}
			if (tagIds && tagIds.length > 0) {
				await tx
					.insert(taskTags)
					.values(tagIds.map((tagId) => ({ taskId: row.id, tagId })));
			}
			const [finalRow] = await tx
				.update(tasks)
				.set({ status: data.status })
				.where(eq(tasks.id, row.id))
				.returning();
			return toTask(finalRow);
		});
	},
	async moveWithHistory(taskId, toStatus) {
		return db.transaction(async (tx) => {
			const [current] = await tx
				.select()
				.from(tasks)
				.where(eq(tasks.id, taskId))
				.for("update");
			if (!current) throw new ApplicationError("Task não encontrada");
			if (current.status === toStatus) return toTask(current);

			const [row] = await tx
				.update(tasks)
				.set({ status: toStatus })
				.where(eq(tasks.id, taskId))
				.returning();
			await tx.insert(taskStatusChanges).values({
				taskId,
				fromStatus: current.status,
				toStatus,
			});
			return toTask(row);
		});
	},
	async setBlockedWithHistory(taskId, blocked) {
		return db.transaction(async (tx) => {
			const [current] = await tx
				.select()
				.from(tasks)
				.where(eq(tasks.id, taskId))
				.for("update");
			if (!current) throw new ApplicationError("Task não encontrada");
			if (current.blocked === blocked) return toTask(current);

			if (blocked) {
				await tx.insert(taskBlockedPeriods).values({ taskId });
			} else {
				const [open] = await tx
					.select()
					.from(taskBlockedPeriods)
					.where(
						and(
							eq(taskBlockedPeriods.taskId, taskId),
							isNull(taskBlockedPeriods.unblockedAt),
						),
					)
					.orderBy(desc(taskBlockedPeriods.blockedAt))
					.limit(1)
					.for("update");
				if (!open) {
					throw new ApplicationError(
						"Não há período de bloqueio aberto para esta task",
					);
				}
				await tx
					.update(taskBlockedPeriods)
					.set({ unblockedAt: new Date() })
					.where(eq(taskBlockedPeriods.id, open.id));
			}

			const [row] = await tx
				.update(tasks)
				.set({ blocked })
				.where(eq(tasks.id, taskId))
				.returning();
			return toTask(row);
		});
	},
	async update(taskId: string, data: UpdateTaskData) {
		const { tagIds, ...taskData } = data;
		return db.transaction(async (tx) => {
			const [row] = await tx
				.update(tasks)
				.set(taskData)
				.where(eq(tasks.id, taskId))
				.returning();
			if (!row) {
				throw new Error("Task não encontrada");
			}
			if (tagIds) {
				await tx.delete(taskTags).where(eq(taskTags.taskId, taskId));
				if (tagIds.length > 0) {
					await tx
						.insert(taskTags)
						.values(tagIds.map((tagId) => ({ taskId, tagId })));
				}
			}
			return toTask(row);
		});
	},
	async delete(taskId: string) {
		await db.delete(tasks).where(eq(tasks.id, taskId));
	},
	async findById(taskId: string) {
		const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId));
		return row ? toTask(row) : null;
	},
	async findByExternalId(teamId: string, externalId: string) {
		const [row] = await db
			.select()
			.from(tasks)
			.where(and(eq(tasks.teamId, teamId), eq(tasks.externalId, externalId)));
		return row ? toTask(row) : null;
	},
	async listByTeam(teamId: string, completedTaskLimit = 50) {
		const [activeRows, doneRows] = await Promise.all([
			db
				.select()
				.from(tasks)
				.where(and(eq(tasks.teamId, teamId), ne(tasks.status, "DONE"))),
			db
				.select(getTableColumns(tasks))
				.from(tasks)
				.innerJoin(
					taskStatusChanges,
					and(
						eq(taskStatusChanges.taskId, tasks.id),
						eq(taskStatusChanges.toStatus, "DONE"),
					),
				)
				.where(and(eq(tasks.teamId, teamId), eq(tasks.status, "DONE")))
				.groupBy(tasks.id)
				.orderBy(desc(max(taskStatusChanges.changedAt)))
				.limit(completedTaskLimit),
		]);
		return [...activeRows, ...doneRows].map(toTask);
	},
	async listBySprint(sprintId: string) {
		const rows = await db
			.select()
			.from(tasks)
			.where(eq(tasks.sprintId, sprintId));
		return rows.map(toTask);
	},
	async countByType(typeId: string) {
		const [result] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(tasks)
			.where(eq(tasks.typeId, typeId));
		return result?.count ?? 0;
	},
	async listUsedTypeIds() {
		const rows = await db.selectDistinct({ typeId: tasks.typeId }).from(tasks);
		return rows.map((row) => row.typeId);
	},
	async hasTasksForTeam(teamId) {
		const [row] = await db
			.select({ id: tasks.id })
			.from(tasks)
			.where(eq(tasks.teamId, teamId))
			.limit(1);
		return Boolean(row);
	},
	async hasTasksForAssignee(assigneeId) {
		const [row] = await db
			.select({ id: tasks.id })
			.from(tasks)
			.where(eq(tasks.assigneeId, assigneeId))
			.limit(1);
		return Boolean(row);
	},
	async countByTag(tagId: string) {
		const [result] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(taskTags)
			.where(eq(taskTags.tagId, tagId));
		return result?.count ?? 0;
	},
	async listUsedTagIds() {
		const rows = await db
			.selectDistinct({ tagId: taskTags.tagId })
			.from(taskTags);
		return rows.map((row) => row.tagId);
	},
	async listTagIdsForTasks(taskIds: string[]) {
		if (taskIds.length === 0) return {};
		const rows = await db
			.select({ taskId: taskTags.taskId, tagId: taskTags.tagId })
			.from(taskTags)
			.where(inArray(taskTags.taskId, taskIds));
		const result: Record<string, string[]> = {};
		for (const taskId of taskIds) result[taskId] = [];
		for (const row of rows) result[row.taskId].push(row.tagId);
		return result;
	},
};
