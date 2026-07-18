import { and, eq, sql } from "drizzle-orm";
import type {
	CreateTaskData,
	TaskRepository,
	UpdateTaskData,
} from "@/application/task/ports/task-repository";
import type { Task, TaskStatus } from "@/domain/task/entities/task";
import { db } from "@/infrastructure/db/client";
import { tasks } from "./drizzle/schema";

function toTask(row: typeof tasks.$inferSelect): Task {
	return { ...row, status: row.status as TaskStatus };
}

export const drizzleTaskRepository: TaskRepository = {
	async create(data: CreateTaskData) {
		const [row] = await db.insert(tasks).values(data).returning();
		return toTask(row);
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
	async updateStatus(taskId: string, status) {
		const [row] = await db
			.update(tasks)
			.set({ status })
			.where(eq(tasks.id, taskId))
			.returning();
		if (!row) {
			throw new Error("Task não encontrada");
		}
		return toTask(row);
	},
	async updateBlocked(taskId: string, blocked) {
		const [row] = await db
			.update(tasks)
			.set({ blocked })
			.where(eq(tasks.id, taskId))
			.returning();
		if (!row) {
			throw new Error("Task não encontrada");
		}
		return toTask(row);
	},
	async countByType(typeId: string) {
		const [result] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(tasks)
			.where(eq(tasks.typeId, typeId));
		return result?.count ?? 0;
	},
};
