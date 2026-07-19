import { ApplicationError } from "@/application/shared/application-error";
import type { TaskUsageQuery } from "@/application/task/contracts/task-usage-query";
import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function deleteTeam(
	repository: TeamRepository,
	usage: TaskUsageQuery,
	teamId: string,
) {
	if (await usage.hasTasksForTeam(teamId)) {
		throw new ApplicationError("Time possui tasks");
	}
	await repository.delete(teamId);
}
