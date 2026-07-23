import type { CreateProgramIncrementData } from "@/application/sprint/ports/program-increment-repository";
import type { CreateSprintData } from "@/application/sprint/ports/sprint-repository";
import { createProgramIncrement } from "@/application/sprint/use-cases/create-program-increment";
import { createSprint } from "@/application/sprint/use-cases/create-sprint";
import { listProgramIncrementsByTeam } from "@/application/sprint/use-cases/list-program-increments-by-team";
import { listSprintsByPi } from "@/application/sprint/use-cases/list-sprints-by-pi";
import { drizzleProgramIncrementRepository } from "@/infrastructure/sprint/drizzle-program-increment-repository";
import { drizzleSprintRepository } from "@/infrastructure/sprint/drizzle-sprint-repository";

export function createSprintUseCases() {
	return {
		createProgramIncrement: (data: CreateProgramIncrementData) =>
			createProgramIncrement(drizzleProgramIncrementRepository, data),
		listProgramIncrementsByTeam: (teamId: string) =>
			listProgramIncrementsByTeam(drizzleProgramIncrementRepository, teamId),
		createSprint: (data: CreateSprintData) =>
			createSprint(drizzleSprintRepository, drizzleProgramIncrementRepository, data),
		listSprintsByPi: (piId: string) => listSprintsByPi(drizzleSprintRepository, piId),
	};
}
