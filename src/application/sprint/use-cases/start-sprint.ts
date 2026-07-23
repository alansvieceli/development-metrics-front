import { ApplicationError } from "@/application/shared/application-error";
import type { SprintRepository } from "@/application/sprint/ports/sprint-repository";

export async function startSprint(repository: SprintRepository, teamId: string) {
	const teamSprints = await repository.listByTeam(teamId);
	if (teamSprints.some((sprint) => sprint.status === "ACTIVE")) {
		throw new ApplicationError("Já existe uma sprint ativa para este time");
	}
	const [nextSprint] = teamSprints
		.filter((sprint) => sprint.status === "PLANNED")
		.sort((a, b) => a.startDate.localeCompare(b.startDate));
	if (!nextSprint) {
		throw new ApplicationError("Não há sprint planejada para iniciar");
	}
	return repository.updateStatus(nextSprint.id, "ACTIVE");
}
