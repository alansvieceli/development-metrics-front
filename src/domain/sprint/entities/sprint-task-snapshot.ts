import type { TaskStatus } from "@/domain/task/entities/task";

export type SprintTaskSnapshot = {
	id: string;
	sprintId: string;
	taskId: string;
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	statusAtFreeze: TaskStatus;
	carriedOver: boolean;
};
