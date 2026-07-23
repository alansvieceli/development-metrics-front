import { ApplicationError } from "@/application/shared/application-error";
import type {
	CreateTaskData,
	TaskRepository,
	UpdateTaskData,
} from "@/application/task/ports/task-repository";
import type { Task } from "@/domain/task/entities/task";
import type { TaskBlockedPeriod } from "@/domain/task/entities/task-blocked-period";
import type { TaskStatusChange } from "@/domain/task/entities/task-status-change";

export type FakeTaskRepository = TaskRepository & {
	statusChanges: TaskStatusChange[];
	blockedPeriods: TaskBlockedPeriod[];
	listUsedTypeIdsCalls: number;
	seed(data: CreateTaskData): Promise<Task>;
	seedTagAssociation(taskId: string, tagId: string): void;
};

export function createFakeTaskRepository(): FakeTaskRepository {
	let tasks: Task[] = [];
	let nextId = 1;
	const statusChanges: TaskStatusChange[] = [];
	const blockedPeriods: TaskBlockedPeriod[] = [];
	const taskTagIds: { taskId: string; tagId: string }[] = [];

	async function seed(data: CreateTaskData) {
		const now = new Date();
		const task: Task = {
			id: `task-${nextId++}`,
			...data,
			sprintId: data.sprintId ?? null,
			blocked: false,
			createdAt: now,
			updatedAt: now,
		};
		tasks.push(task);
		return task;
	}

	return {
		statusChanges,
		blockedPeriods,
		listUsedTypeIdsCalls: 0,
		seed,
		seedTagAssociation(taskId, tagId) {
			taskTagIds.push({ taskId, tagId });
		},
		async createWithInitialHistory(data) {
			const task = await seed(data);
			statusChanges.push({
				id: `status-change-${nextId++}`,
				taskId: task.id,
				fromStatus: null,
				toStatus: task.status,
				changedAt: new Date(),
			});
			if (data.tagIds) {
				taskTagIds.push(
					...data.tagIds.map((tagId) => ({ taskId: task.id, tagId })),
				);
			}
			return task;
		},
		async createWithExplicitHistory(data, history) {
			const task: Task = {
				id: `task-${nextId++}`,
				...data,
				sprintId: data.sprintId ?? null,
				status: data.status,
				blocked: false,
				createdAt: history[0].changedAt,
				updatedAt: history[history.length - 1].changedAt,
			};
			tasks.push(task);
			let fromStatus: Task["status"] | null = null;
			for (const step of history) {
				statusChanges.push({
					id: `status-change-${nextId++}`,
					taskId: task.id,
					fromStatus,
					toStatus: step.status,
					changedAt: step.changedAt,
				});
				fromStatus = step.status;
			}
			return task;
		},
		async moveWithHistory(taskId, toStatus) {
			const task = tasks.find((item) => item.id === taskId);
			if (!task) throw new ApplicationError("Task não encontrada");
			if (task.status === toStatus) return task;
			const fromStatus = task.status;
			task.status = toStatus;
			task.updatedAt = new Date();
			statusChanges.push({
				id: `status-change-${nextId++}`,
				taskId,
				fromStatus,
				toStatus,
				changedAt: new Date(),
			});
			return task;
		},
		async setBlockedWithHistory(taskId, blocked) {
			const task = tasks.find((item) => item.id === taskId);
			if (!task) throw new ApplicationError("Task não encontrada");
			if (task.blocked === blocked) return task;
			if (blocked) {
				blockedPeriods.push({
					id: `blocked-period-${nextId++}`,
					taskId,
					blockedAt: new Date(),
					unblockedAt: null,
				});
			} else {
				const open = [...blockedPeriods]
					.reverse()
					.find((period) => period.taskId === taskId && !period.unblockedAt);
				if (!open)
					throw new ApplicationError(
						"Não há período de bloqueio aberto para esta task",
					);
				open.unblockedAt = new Date();
			}
			task.blocked = blocked;
			task.updatedAt = new Date();
			return task;
		},
		async update(taskId: string, data: UpdateTaskData) {
			const task = tasks.find((item) => item.id === taskId);
			if (!task) throw new ApplicationError("Task não encontrada");
			const { sprintId, tagIds, ...rest } = data;
			Object.assign(task, rest, { updatedAt: new Date() });
			if (sprintId !== undefined) {
				task.sprintId = sprintId;
			}
			if (tagIds) {
				const remaining = taskTagIds.filter((a) => a.taskId !== taskId);
				remaining.push(...tagIds.map((tagId) => ({ taskId, tagId })));
				taskTagIds.length = 0;
				taskTagIds.push(...remaining);
			}
			return task;
		},
		async delete(taskId) {
			tasks = tasks.filter((task) => task.id !== taskId);
		},
		async findById(taskId) {
			return tasks.find((task) => task.id === taskId) ?? null;
		},
		async findByExternalId(teamId, externalId) {
			return (
				tasks.find(
					(task) => task.teamId === teamId && task.externalId === externalId,
				) ?? null
			);
		},
		async listByTeam(teamId) {
			return tasks.filter((task) => task.teamId === teamId);
		},
		async countByType(typeId) {
			return tasks.filter((task) => task.typeId === typeId).length;
		},
		async listUsedTypeIds() {
			this.listUsedTypeIdsCalls++;
			return [...new Set(tasks.map((task) => task.typeId))];
		},
		async hasTasksForTeam(teamId) {
			return tasks.some((task) => task.teamId === teamId);
		},
		async hasTasksForAssignee(assigneeId) {
			return tasks.some((task) => task.assigneeId === assigneeId);
		},
		async countByTag(tagId) {
			return taskTagIds.filter((a) => a.tagId === tagId).length;
		},
		async listUsedTagIds() {
			return [...new Set(taskTagIds.map((a) => a.tagId))];
		},
		async listTagIdsForTasks(taskIds) {
			const result: Record<string, string[]> = {};
			for (const taskId of taskIds) {
				result[taskId] = taskTagIds
					.filter((a) => a.taskId === taskId)
					.map((a) => a.tagId);
			}
			return result;
		},
	};
}
