import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import { isBugTypeName } from "@/domain/task/entities/task-type";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export async function createTaskType(
	repository: TaskTypeRepository,
	name: string,
	color: string,
) {
	const trimmedName = name.trim();
	if (!trimmedName) {
		throw new Error("Nome do tipo não pode ser vazio");
	}
	if (!HEX_COLOR_PATTERN.test(color)) {
		throw new Error("Cor deve ser um hexadecimal válido, ex: #2563eb");
	}
	return repository.create(trimmedName, color, isBugTypeName(trimmedName));
}
