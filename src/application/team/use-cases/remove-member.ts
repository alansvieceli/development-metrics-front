import { ApplicationError } from "@/application/shared/application-error";
import type { TaskUsageQuery } from "@/application/task/contracts/task-usage-query";
import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function removeMember(
	repository: TeamRepository,
	usage: TaskUsageQuery,
	teamId: string,
	memberId: string,
) {
	if (!(await repository.memberBelongsToTeam(memberId, teamId))) {
		throw new ApplicationError("Membro não encontrado");
	}
	if (await usage.hasTasksForAssignee(memberId)) {
		throw new ApplicationError("Membro é responsável por tasks");
	}
	await repository.removeMember(memberId);
}
