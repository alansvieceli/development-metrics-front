import { ApplicationError } from "@/application/shared/application-error";
import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function renameMember(
	repository: TeamRepository,
	teamId: string,
	memberId: string,
	name: string,
) {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new ApplicationError("Nome do membro não pode ser vazio");
	}
	if (!(await repository.memberBelongsToTeam(memberId, teamId))) {
		throw new ApplicationError("Membro não encontrado");
	}
	return repository.renameMember(memberId, trimmed);
}
