import type { Tag } from "@/domain/task/entities/tag";

export type TagRepository = {
	create(name: string, color: string): Promise<Tag>;
	update(tagId: string, name: string, color: string): Promise<Tag>;
	delete(tagId: string): Promise<void>;
	listAll(): Promise<Tag[]>;
	findById(tagId: string): Promise<Tag | null>;
};
