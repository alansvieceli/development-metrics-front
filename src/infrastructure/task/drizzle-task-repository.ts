import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { ApplicationError } from "@/application/shared/application-error";
import type {
	CreateTaskData,
	TaskRepository,
	UpdateTaskData,
} from "@/application/task/ports/task-repository";
import type { Task, TaskStatus } from "@/domain/task/entities/task";
import { db } from "@/infrastructure/db/client";
import { taskBlockedPeriods, taskStatusChanges, tasks } from "./drizzle/schema";

function toTask(row: typeof tasks.$inferSelect): Task {
	return { ...row, status: row.status as TaskStatus };
}

export const drizzleTaskRepository: TaskRepository = {
	async createWithInitialHistory(data: CreateTaskData) {
		return db.transaction(async (tx) => {
			const [row] = await tx.insert(tasks).values(data).returning();
			await tx.insert(taskStatusChanges).values({
				taskId: row.id,
				fromStatus: null,
				toStatus: data.status,
			});
			return toTask(row);
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
		const [row] = await db
			.update(tasks)
			.set(data)
			.where(eq(tasks.id, taskId))
			.returning();
		if (!row) {
			throw new Error("Task não encontrada");
		}
		return toTask(row);
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
	async listByTeam(teamId: string) {
		const rows = await db.select().from(tasks).where(eq(tasks.teamId, teamId));
		return rows.map(toTask);
	},
	async countByType(typeId: string) {
		const [result] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(tasks)
			.where(eq(tasks.typeId, typeId));
		return result?.count ?? 0;
	},
};
