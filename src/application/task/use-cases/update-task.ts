import type { TaskRepository } from "@/application/task/ports/task-repository";

export type UpdateTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	dueDate: string | null;
};

export async function updateTask(
	repository: TaskRepository,
	taskId: string,
	input: UpdateTaskInput,
) {
	const externalId = input.externalId.trim();
	const description = input.description.trim();
	if (!externalId) {
		throw new Error("Id externo não pode ser vazio");
	}
	if (!description) {
		throw new Error("Descrição não pode ser vazia");
	}
	const task = await repository.findById(taskId);
	if (!task) {
		throw new Error("Task não encontrada");
	}
	const existing = await repository.findByExternalId(task.teamId, externalId);
	if (existing && existing.id !== taskId) {
		throw new Error(
			`Já existe uma task com o id externo "${externalId}" neste time`,
		);
	}
	return repository.update(taskId, {
		externalId,
		description,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		dueDate: input.dueDate,
	});
}
