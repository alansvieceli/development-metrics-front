import { asc, eq } from "drizzle-orm";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import type { TaskType } from "@/domain/task/entities/task-type";
import { db } from "@/infrastructure/db/client";
import { taskTypes } from "./drizzle/schema";

export const drizzleTaskTypeRepository: TaskTypeRepository = {
	async create(name, color, isBug) {
		const [taskType] = await db
			.insert(taskTypes)
			.values({ name, color, isBug })
			.returning();
		return taskType as TaskType;
	},
	async update(typeId, name, color, isBug) {
		const [taskType] = await db
			.update(taskTypes)
			.set({ name, color, isBug })
			.where(eq(taskTypes.id, typeId))
			.returning();
		if (!taskType) {
			throw new Error("Tipo de task não encontrado");
		}
		return taskType as TaskType;
	},
	async delete(typeId) {
		await db.delete(taskTypes).where(eq(taskTypes.id, typeId));
	},
	async listAll() {
		return db.select().from(taskTypes).orderBy(asc(taskTypes.id));
	},
	async findById(typeId) {
		const [taskType] = await db
			.select()
			.from(taskTypes)
			.where(eq(taskTypes.id, typeId));
		return (taskType as TaskType) ?? null;
	},
};
