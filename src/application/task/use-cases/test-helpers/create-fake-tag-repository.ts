import type { TagRepository } from "@/application/task/ports/tag-repository";
import type { Tag } from "@/domain/task/entities/tag";

export function createFakeTagRepository(): TagRepository {
	let tags: Tag[] = [];
	let nextId = 1;

	return {
		async create(name, color) {
			const tag: Tag = { id: `tag-${nextId++}`, name, color };
			tags.push(tag);
			return tag;
		},
		async update(tagId, name, color) {
			const tag = tags.find((t) => t.id === tagId);
			if (!tag) {
				throw new Error("Tarja não encontrada");
			}
			tag.name = name;
			tag.color = color;
			return tag;
		},
		async delete(tagId) {
			tags = tags.filter((t) => t.id !== tagId);
		},
		async listAll() {
			return tags;
		},
		async findById(tagId) {
			return tags.find((t) => t.id === tagId) ?? null;
		},
	};
}
