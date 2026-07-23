import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type { ProgramIncrementRepository } from "@/application/sprint/ports/program-increment-repository";
import type {
	CreateSprintData,
	SprintRepository,
} from "@/application/sprint/ports/sprint-repository";

export async function createSprint(
	sprintRepository: SprintRepository,
	programIncrementRepository: ProgramIncrementRepository,
	data: CreateSprintData,
) {
	const pi = await programIncrementRepository.findById(data.piId);
	if (!pi || pi.teamId !== data.teamId) {
		throw new ApplicationError("PI não encontrado");
	}
	const name = data.name.trim();
	if (!name) {
		throw new ApplicationError("Nome da sprint não pode ser vazio");
	}
	const startDate = parseDateOnly(data.startDate);
	if (!startDate) {
		throw new ApplicationError("Data de início inválida");
	}
	const endDate = parseDateOnly(data.endDate);
	if (!endDate) {
		throw new ApplicationError("Data de término inválida");
	}
	if (endDate <= startDate) {
		throw new ApplicationError(
			"Data de término deve ser posterior à data de início",
		);
	}
	return sprintRepository.create({ ...data, name });
}
