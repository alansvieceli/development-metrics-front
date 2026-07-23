import type { CreateHistoricalTaskInput } from "@/application/task/use-cases/create-historical-task";
import { createHistoricalTask } from "@/application/task/use-cases/create-historical-task";
import { createTag } from "@/application/task/use-cases/create-tag";
import type { CreateTaskInput } from "@/application/task/use-cases/create-task";
import { createTask } from "@/application/task/use-cases/create-task";
import { createTaskType } from "@/application/task/use-cases/create-task-type";
import { deleteTag } from "@/application/task/use-cases/delete-tag";
import { deleteTask } from "@/application/task/use-cases/delete-task";
import { deleteTaskType } from "@/application/task/use-cases/delete-task-type";
import { listTags } from "@/application/task/use-cases/list-tags";
import { listTaskTypes } from "@/application/task/use-cases/list-task-types";
import { listTasksByTeam } from "@/application/task/use-cases/list-tasks-by-team";
import { moveTask } from "@/application/task/use-cases/move-task";
import type { CardImportPreview } from "@/application/task/use-cases/preview-card-import";
import { previewCardImport } from "@/application/task/use-cases/preview-card-import";
import { toggleBlocked } from "@/application/task/use-cases/toggle-blocked";
import { updateTag } from "@/application/task/use-cases/update-tag";
import type { UpdateTaskInput } from "@/application/task/use-cases/update-task";
import { updateTask } from "@/application/task/use-cases/update-task";
import { updateTaskType } from "@/application/task/use-cases/update-task-type";
import type { TaskStatus } from "@/domain/task/entities/task";
import { drizzleSprintRepository } from "@/infrastructure/sprint/drizzle-sprint-repository";
import { businessmapCardProvider } from "@/infrastructure/task/businessmap-card-provider";
import { drizzleTagRepository } from "@/infrastructure/task/drizzle-tag-repository";
import { drizzleTaskHistoryRepository } from "@/infrastructure/task/drizzle-task-history-repository";
import { drizzleTaskRepository } from "@/infrastructure/task/drizzle-task-repository";
import { drizzleTaskTypeRepository } from "@/infrastructure/task/drizzle-task-type-repository";
import { drizzleTeamRepository } from "@/infrastructure/team/drizzle-team-repository";

export function createTaskUseCases() {
	return {
		createTask: (input: CreateTaskInput) =>
			createTask(
				drizzleTaskRepository,
				drizzleTaskTypeRepository,
				drizzleTeamRepository,
				input,
				drizzleTagRepository,
				drizzleSprintRepository,
			),
		createHistoricalTask: (input: CreateHistoricalTaskInput) =>
			createHistoricalTask(
				drizzleTaskRepository,
				drizzleTaskTypeRepository,
				drizzleTeamRepository,
				input,
				drizzleTagRepository,
			),
		previewCardImport: (teamId: string, cardId: string) =>
			previewCardImport(
				businessmapCardProvider,
				drizzleTeamRepository,
				teamId,
				cardId,
			),
		importCard: (
			teamId: string,
			preview: CardImportPreview,
			typeId: string,
			tagIds?: string[],
		) =>
			createHistoricalTask(
				drizzleTaskRepository,
				drizzleTaskTypeRepository,
				drizzleTeamRepository,
				{
					externalId: preview.externalId,
					description: preview.description,
					typeId,
					assigneeId: preview.resolvedAssigneeId,
					teamId,
					dueDate: preview.dueDate,
					steps: preview.steps,
					tagIds,
				},
				drizzleTagRepository,
			),
		updateTask: (teamId: string, taskId: string, input: UpdateTaskInput) =>
			updateTask(
				drizzleTaskRepository,
				drizzleTaskTypeRepository,
				drizzleTeamRepository,
				teamId,
				taskId,
				input,
				drizzleTagRepository,
				drizzleSprintRepository,
			),
		deleteTask: (teamId: string, taskId: string) =>
			deleteTask(drizzleTaskRepository, teamId, taskId),
		moveTask: (teamId: string, taskId: string, toStatus: TaskStatus) =>
			moveTask(drizzleTaskRepository, teamId, taskId, toStatus),
		toggleBlocked: (teamId: string, taskId: string, blocked: boolean) =>
			toggleBlocked(drizzleTaskRepository, teamId, taskId, blocked),
		listTasksByTeam: (teamId: string) =>
			listTasksByTeam(
				drizzleTaskRepository,
				drizzleTaskHistoryRepository,
				drizzleTaskTypeRepository,
				drizzleTagRepository,
				teamId,
			),
		createTaskType: (name: string, color: string) =>
			createTaskType(drizzleTaskTypeRepository, name, color),
		updateTaskType: (typeId: string, name: string, color: string) =>
			updateTaskType(drizzleTaskTypeRepository, typeId, name, color),
		deleteTaskType: (typeId: string) =>
			deleteTaskType(drizzleTaskTypeRepository, drizzleTaskRepository, typeId),
		listTaskTypes: () =>
			listTaskTypes(drizzleTaskTypeRepository, drizzleTaskRepository),
		createTag: (name: string, color: string) =>
			createTag(drizzleTagRepository, name, color),
		updateTag: (tagId: string, name: string, color: string) =>
			updateTag(drizzleTagRepository, tagId, name, color),
		deleteTag: (tagId: string) =>
			deleteTag(drizzleTagRepository, drizzleTaskRepository, tagId),
		listTags: () => listTags(drizzleTagRepository, drizzleTaskRepository),
	};
}
