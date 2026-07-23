import { asc, eq } from "drizzle-orm";
import type { TagRepository } from "@/application/task/ports/tag-repository";
import type { Tag } from "@/domain/task/entities/tag";
import { db } from "@/infrastructure/db/client";
import { tags } from "./drizzle/schema";

export const drizzleTagRepository: TagRepository = {
	async create(name, color) {
		const [tag] = await db.insert(tags).values({ name, color }).returning();
		return tag as Tag;
	},
	async update(tagId, name, color) {
		const [tag] = await db
			.update(tags)
			.set({ name, color })
			.where(eq(tags.id, tagId))
			.returning();
		if (!tag) {
			throw new Error("Tarja não encontrada");
		}
		return tag as Tag;
	},
	async delete(tagId) {
		await db.delete(tags).where(eq(tags.id, tagId));
	},
	async listAll() {
		return db.select().from(tags).orderBy(asc(tags.id));
	},
	async findById(tagId) {
		const [tag] = await db.select().from(tags).where(eq(tags.id, tagId));
		return (tag as Tag) ?? null;
	},
};
