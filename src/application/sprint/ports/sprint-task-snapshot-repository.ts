import type { SprintTaskSnapshot } from "@/domain/sprint/entities/sprint-task-snapshot";
import type { TaskStatus } from "@/domain/task/entities/task";

export type CreateSprintTaskSnapshotData = {
	sprintId: string;
	taskId: string;
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	statusAtFreeze: TaskStatus;
	carriedOver: boolean;
};

export type SprintTaskSnapshotRepository = {
	createMany(data: CreateSprintTaskSnapshotData[]): Promise<void>;
	listBySprint(sprintId: string): Promise<SprintTaskSnapshot[]>;
};
