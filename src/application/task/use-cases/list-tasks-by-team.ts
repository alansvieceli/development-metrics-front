import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import type { Task, TaskStatus } from "@/domain/task/entities/task";

export type TaskWithStatusSince = Task & {
	statusChangedAt: Date;
	bugChildCount: number;
	otherChildCount: number;
	parentTask: { id: string; externalId: string } | null;
};
export type TasksByStatus = Record<TaskStatus, TaskWithStatusSince[]>;

export async function listTasksByTeam(
	repository: TaskRepository,
	historyRepository: TaskHistoryRepository,
	typeRepository: TaskTypeRepository,
	teamId: string,
): Promise<TasksByStatus> {
	const tasks = await repository.listByTeam(teamId);
	const changedAtByTaskId = await historyRepository.getStatusChangedAtForTasks(
		tasks.map((task) => task.id),
	);
	const taskTypes = await typeRepository.listAll();
	const bugTypeIds = new Set(
		taskTypes.filter((type) => type.isBug).map((type) => type.id),
	);
	const tasksById = new Map(tasks.map((task) => [task.id, task]));
	const childrenByParentId = new Map<string, Task[]>();
	for (const task of tasks) {
		if (!task.parentTaskId) continue;
		const children = childrenByParentId.get(task.parentTaskId) ?? [];
		children.push(task);
		childrenByParentId.set(task.parentTaskId, children);
	}

	const grouped: TasksByStatus = {
		TODO: [],
		IN_DEVELOPMENT: [],
		CODE_REVIEW: [],
		TESTING: [],
		AWAITING_PUBLICATION: [],
		DONE: [],
	};
	for (const task of tasks) {
		const children = childrenByParentId.get(task.id) ?? [];
		const bugChildCount = children.filter((child) =>
			bugTypeIds.has(child.typeId),
		).length;
		const parent = task.parentTaskId
			? tasksById.get(task.parentTaskId)
			: undefined;
		grouped[task.status].push({
			...task,
			statusChangedAt: changedAtByTaskId[task.id] ?? task.createdAt,
			bugChildCount,
			otherChildCount: children.length - bugChildCount,
			parentTask: parent
				? { id: parent.id, externalId: parent.externalId }
				: null,
		});
	}
	return grouped;
}
