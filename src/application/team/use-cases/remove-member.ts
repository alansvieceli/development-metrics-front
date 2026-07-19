import { ApplicationError } from "@/application/shared/application-error";
import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function removeMember(
	repository: TeamRepository,
	teamId: string,
	memberId: string,
) {
	if (!(await repository.memberBelongsToTeam(memberId, teamId))) {
		throw new ApplicationError("Membro não encontrado");
	}
	await repository.removeMember(memberId);
}
