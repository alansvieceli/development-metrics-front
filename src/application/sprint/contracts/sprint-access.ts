import type { Sprint } from "@/domain/sprint/entities/sprint";

export type SprintAccess = {
	findById(sprintId: string): Promise<Sprint | null>;
};
