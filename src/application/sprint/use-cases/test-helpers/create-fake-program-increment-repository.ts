import type {
	CreateProgramIncrementData,
	ProgramIncrementRepository,
} from "@/application/sprint/ports/program-increment-repository";
import type { ProgramIncrement } from "@/domain/sprint/entities/program-increment";

export function createFakeProgramIncrementRepository(): ProgramIncrementRepository {
	const programIncrements: ProgramIncrement[] = [];
	let nextId = 1;

	return {
		async create(data: CreateProgramIncrementData) {
			const pi: ProgramIncrement = { id: `pi-${nextId++}`, ...data };
			programIncrements.push(pi);
			return pi;
		},
		async listByTeam(teamId) {
			return programIncrements.filter((pi) => pi.teamId === teamId);
		},
		async findById(id) {
			return programIncrements.find((pi) => pi.id === id) ?? null;
		},
	};
}
