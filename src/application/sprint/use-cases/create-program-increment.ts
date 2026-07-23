import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type {
	CreateProgramIncrementData,
	ProgramIncrementRepository,
} from "@/application/sprint/ports/program-increment-repository";

export async function createProgramIncrement(
	repository: ProgramIncrementRepository,
	data: CreateProgramIncrementData,
) {
	const name = data.name.trim();
	if (!name) {
		throw new ApplicationError("Nome do PI não pode ser vazio");
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
	return repository.create({ ...data, name });
}
