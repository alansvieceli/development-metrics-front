import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type { TagRepository } from "@/application/task/ports/tag-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import { validateTagIds } from "@/application/task/validate-tag-ids";
import { validateTaskReferences } from "@/application/task/validate-task-references";
import type { TeamAccess } from "@/application/team/contracts/team-access";
import type { TaskStatus } from "@/domain/task/entities/task";

export type CreateHistoricalTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	dueDate: string;
	steps: { status: TaskStatus; date: string }[];
	tagIds?: string[];
};

export async function createHistoricalTask(
	repository: TaskRepository,
	typeRepository: TaskTypeRepository,
	teamAccess: TeamAccess,
	input: CreateHistoricalTaskInput,
	tagRepository?: TagRepository,
) {
	const externalId = input.externalId.trim();
	const description = input.description.trim();
	if (!externalId) {
		throw new ApplicationError("Id externo não pode ser vazio");
	}
	if (!description) {
		throw new ApplicationError("Descrição não pode ser vazia");
	}
	if (input.steps.length === 0) {
		throw new ApplicationError("Informe ao menos uma etapa");
	}
	const steps = input.steps.map((step) => {
		const changedAt = parseDateOnly(step.date);
		if (!changedAt) {
			throw new ApplicationError("Data de etapa inválida");
		}
		return { status: step.status, changedAt };
	});
	for (let i = 1; i < steps.length; i++) {
		if (steps[i].changedAt.getTime() < steps[i - 1].changedAt.getTime()) {
			throw new ApplicationError(
				"As datas das etapas devem estar em ordem crescente",
			);
		}
		if (steps[i].status === steps[i - 1].status) {
			throw new ApplicationError(
				"Duas etapas seguidas não podem ter o mesmo status",
			);
		}
	}
	await validateTaskReferences(repository, typeRepository, teamAccess, {
		teamId: input.teamId,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		dueDate: input.dueDate,
		externalId,
		parentTaskId: null,
	});
	if (tagRepository && input.tagIds) {
		await validateTagIds(tagRepository, input.tagIds);
	}
	return repository.createWithExplicitHistory(
		{
			externalId,
			description,
			typeId: input.typeId,
			assigneeId: input.assigneeId,
			teamId: input.teamId,
			status: steps[steps.length - 1].status,
			dueDate: input.dueDate,
			parentTaskId: null,
			tagIds: input.tagIds,
		},
		steps,
	);
}
