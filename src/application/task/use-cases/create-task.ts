import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskStatus } from "@/domain/task/entities/task";

export type CreateTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	status: TaskStatus;
	dueDate: string | null;
};

export async function createTask(
	repository: TaskRepository,
	historyRepository: TaskHistoryRepository,
	input: CreateTaskInput,
) {
	const externalId = input.externalId.trim();
	const description = input.description.trim();
	if (!externalId) {
		throw new Error("Id externo não pode ser vazio");
	}
	if (!description) {
		throw new Error("Descrição não pode ser vazia");
	}
	const existing = await repository.findByExternalId(input.teamId, externalId);
	if (existing) {
		throw new Error(
			`Já existe uma task com o id externo "${externalId}" neste time`,
		);
	}
	const task = await repository.create({
		externalId,
		description,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		teamId: input.teamId,
		status: input.status,
		dueDate: input.dueDate,
	});
	await historyRepository.recordStatusChange(task.id, null, task.status);
	return task;
}
